(() => {
  const sdk = window.supabase;
  if (!sdk || typeof sdk.createClient !== "function") {
    window.AdFontesAuth = { client: null };
    return;
  }

  const client = sdk.createClient(
    "https://kwrdgcvwqvedqcbhwhgx.supabase.co",
    "sb_publishable_Z8DN8rUR6nLTQELNPjWFiw_yuBfb6yz",
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    },
  );

  window.AdFontesAuth = { client };
})();
