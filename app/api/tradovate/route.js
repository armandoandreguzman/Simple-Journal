// app/api/tradovate/route.js
// Tradovate API integration - keeps credentials server-side only

export async function POST(request) {
  const { action, username, password, accessToken, accountId } = await request.json();

  // Tradovate endpoints — prop firms like Lucid use the md endpoint
  const URLS = [
    "https://live.tradovateapi.com/v1",
    "https://md.tradovateapi.com/v1",
    "https://demo.tradovateapi.com/v1",
  ];

  const tryAuth = async (baseUrl) => {
    const res = await fetch(`${baseUrl}/auth/accesstokenrequest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: username,
        password: password,
        appId: "Simple Journal",
        appVersion: "1.0",
        cid: 8,
        sec: "e126443c-57ca-4bfb-8a6b-2ba3c98c0946",
      }),
    });
    return res;
  };

  // ── ACTION: LOGIN ──
  if (action === "login") {
    try {
      let data = null;
      let env = "live";
      let successUrl = URLS[0];

      // Try each URL until one works
      for (const url of URLS) {
        const res = await tryAuth(url);
        const d = await res.json();
        if (d.accessToken && !d.errorText) {
          data = d;
          successUrl = url;
          env = url.includes("demo") ? "demo" : "live";
          break;
        }
      }

      if (!data || !data.accessToken) {
        return Response.json({ error: "Login failed. Please check your Tradovate username and password." }, { status: 401 });
      }

      // Get accounts list
      const baseUrl = successUrl;
      const accRes = await fetch(`${baseUrl}/account/list`, {
        headers: { "Authorization": `Bearer ${data.accessToken}` }
      });
      const accounts = await accRes.json();

      return Response.json({
        accessToken: data.accessToken,
        env,
        accounts: Array.isArray(accounts) ? accounts.map(a => ({
          id: a.id,
          name: a.name,
          nickname: a.nickname || a.name,
        })) : [],
      });
    } catch (err) {
      return Response.json({ error: "Connection failed: " + err.message }, { status: 500 });
    }
  }

  // ── ACTION: FETCH TRADES ──
  if (action === "trades") {
    try {
      const env = request.headers.get("x-tradovate-env") || "live";
      // baseUrl already set above

      // Get fills (executed trades) for the account
      const fillsRes = await fetch(`${baseUrl}/fill/list`, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      const fills = await fillsRes.json();

      if (!Array.isArray(fills)) {
        return Response.json({ error: "Could not fetch trades. Token may have expired." }, { status: 401 });
      }

      // Filter by account if provided
      const filtered = accountId
        ? fills.filter(f => String(f.accountId) === String(accountId))
        : fills;

      // Get contracts for symbol names
      const contractIds = [...new Set(filtered.map(f => f.contractId))];
      const contracts = {};
      for (const cid of contractIds.slice(0, 50)) {
        const cRes = await fetch(`${baseUrl}/contract/item?id=${cid}`, {
          headers: { "Authorization": `Bearer ${accessToken}` }
        });
        const c = await cRes.json();
        if (c.name) contracts[cid] = c.name;
      }

      // Map fills to trade format
      // Group fills by orderId to match entries/exits
      const orderMap = {};
      for (const fill of filtered) {
        const key = fill.orderId;
        if (!orderMap[key]) orderMap[key] = [];
        orderMap[key].push(fill);
      }

      const trades = filtered.map(fill => {
        const symbol = (contracts[fill.contractId] || String(fill.contractId))
          .replace(/[0-9]{2}$/, "") // remove expiry digits
          .toUpperCase();
        const date = fill.timestamp
          ? new Date(fill.timestamp).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10);
        const entryTime = fill.timestamp
          ? new Date(fill.timestamp).toTimeString().slice(0, 5)
          : "";
        const tradeType = fill.action === "Buy" ? "Long" : "Short";
        const price = fill.price || 0;
        const qty = fill.qty || 0;

        return {
          _fillId: fill.id,
          _orderId: fill.orderId,
          symbol,
          date,
          entryTime,
          tradeType,
          openPrice: price,
          closePrice: 0,
          lotSize: qty,
          netPnL: fill.totalFees ? -fill.totalFees : 0,
          commissions: fill.totalFees || 0,
          tradeStatus: "Running",
          followedRules: "Yes",
          mistakeType: "None",
          confidenceLevel: 7,
          ltfcTags: [],
          notes: `Tradovate sync · Fill ID: ${fill.id}`,
          resultR: "",
        };
      });

      return Response.json({ trades: trades.slice(0, 100) }); // limit 100
    } catch (err) {
      return Response.json({ error: "Failed to fetch trades: " + err.message }, { status: 500 });
    }
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
}