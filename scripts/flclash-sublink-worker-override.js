// FlClash override script.
// Paste this file into FlClash when you want to keep only subscription nodes
// while rebuilding the rest of the Mihomo config with Sublink Worker defaults.

function main(config) {
  const proxies = Array.isArray(config.proxies)
    ? config.proxies.filter((proxy) => proxy && proxy.name)
    : [];

  const proxyProviders =
    config["proxy-providers"] && typeof config["proxy-providers"] === "object"
      ? config["proxy-providers"]
      : {};

  const proxyNames = unique(proxies.map((proxy) => proxy.name).filter(Boolean));
  const providerNames = Object.keys(proxyProviders);

  if (proxyNames.length === 0 && providerNames.length === 0) {
    return config;
  }

  const names = {
    auto: "⚡ 自动选择",
    node: "🚀 节点选择",
    fallback: "🐟 漏网之鱼",
    adBlock: "🛑 广告拦截",
    ai: "💬 AI 服务",
    bilibili: "📺 哔哩哔哩",
    youtube: "📹 油管视频",
    google: "🔍 谷歌服务",
    private: "🏠 私有网络",
    cn: "🔒 国内服务",
    telegram: "📲 电报消息",
    github: "🐱 Github",
    microsoft: "Ⓜ️ 微软服务",
    apple: "🍏 苹果服务",
    social: "🌐 社交媒体",
    streaming: "🎬 流媒体",
    gaming: "🎮 游戏平台",
    education: "📚 教育资源",
    financial: "💰 金融服务",
    cloud: "☁️ 云服务",
    nonChina: "🌐 非中国",
  };

  const unifiedRules = [
    { key: "Ad Block", group: names.adBlock, site: ["category-ads-all"], ip: [] },
    { key: "AI Services", group: names.ai, site: ["category-ai-!cn"], ip: [] },
    { key: "Bilibili", group: names.bilibili, site: ["bilibili"], ip: [] },
    { key: "Youtube", group: names.youtube, site: ["youtube"], ip: [] },
    { key: "Google", group: names.google, site: ["google"], ip: ["google"] },
    { key: "Private", group: names.private, site: [], ip: ["private"] },
    { key: "Location:CN", group: names.cn, site: ["geolocation-cn", "cn"], ip: ["cn"] },
    { key: "Telegram", group: names.telegram, site: [], ip: ["telegram"] },
    { key: "Github", group: names.github, site: ["github", "gitlab"], ip: [] },
    { key: "Microsoft", group: names.microsoft, site: ["microsoft"], ip: [] },
    { key: "Apple", group: names.apple, site: ["apple"], ip: [] },
    { key: "Social Media", group: names.social, site: ["facebook", "instagram", "twitter", "tiktok", "linkedin"], ip: [] },
    { key: "Streaming", group: names.streaming, site: ["netflix", "hulu", "disney", "hbo", "amazon", "bahamut"], ip: [] },
    { key: "Gaming", group: names.gaming, site: ["steam", "epicgames", "ea", "ubisoft", "blizzard"], ip: [] },
    { key: "Education", group: names.education, site: ["coursera", "edx", "udemy", "khanacademy", "category-scholar-!cn"], ip: [] },
    { key: "Financial", group: names.financial, site: ["paypal", "visa", "mastercard", "stripe", "wise"], ip: [] },
    { key: "Cloud Services", group: names.cloud, site: ["aws", "azure", "digitalocean", "heroku", "dropbox"], ip: [] },
    { key: "Non-China", group: names.nonChina, site: ["geolocation-!cn"], ip: [] },
  ];

  const balancedRuleNames = new Set([
    "Location:CN",
    "Private",
    "Non-China",
    "Github",
    "Google",
    "Youtube",
    "AI Services",
    "Telegram",
  ]);
  const selectedRules = unifiedRules.filter((rule) => balancedRuleNames.has(rule.key));
  const directDefaultRules = new Set(["Private", "Location:CN"]);
  const testUrl = "https://www.gstatic.com/generate_204";
  const siteRuleBase = "https://gh-proxy.com/https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geosite/";
  const ipRuleBase = "https://gh-proxy.com/https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geoip/";
  const ruleExt = ".mrs";

  Object.values(proxyProviders).forEach((provider) => {
    if (provider && typeof provider === "object" && !provider["health-check"]) {
      provider["health-check"] = {
        enable: true,
        url: testUrl,
        interval: 300,
        timeout: 5000,
        lazy: true,
      };
    }
  });

  const withProviders = (group) => {
    if (providerNames.length > 0) {
      group.use = providerNames;
    }
    return group;
  };

  const nodeMembers = unique([names.auto, ...proxyNames, "DIRECT", "REJECT"]);
  const selectMembers = unique([names.node, ...proxyNames, "DIRECT", "REJECT"]);
  const directFirstMembers = unique(["DIRECT", ...selectMembers.filter((item) => item !== "DIRECT")]);

  const proxyGroups = [
    withProviders({
      name: names.node,
      type: "select",
      proxies: nodeMembers,
    }),
    withProviders({
      name: names.auto,
      type: "url-test",
      proxies: proxyNames,
      url: testUrl,
      interval: 300,
      lazy: false,
    }),
  ];

  selectedRules.forEach((rule) => {
    proxyGroups.push(
      withProviders({
        name: rule.group,
        type: "select",
        proxies: directDefaultRules.has(rule.key) ? directFirstMembers : selectMembers,
      })
    );
  });

  proxyGroups.push(
    withProviders({
      name: names.fallback,
      type: "select",
      proxies: selectMembers,
    })
  );

  const ruleProviders = {};
  selectedRules.forEach((rule) => {
    rule.site.forEach((site) => {
      ruleProviders[site] = {
        type: "http",
        format: "mrs",
        behavior: "domain",
        url: `${siteRuleBase}${site}${ruleExt}`,
        path: `./ruleset/${site}${ruleExt}`,
        interval: 86400,
      };
    });

    rule.ip.forEach((ip) => {
      ruleProviders[`${ip}-ip`] = {
        type: "http",
        format: "mrs",
        behavior: "ipcidr",
        url: `${ipRuleBase}${ip}${ruleExt}`,
        path: `./ruleset/${ip}-ip${ruleExt}`,
        interval: 86400,
      };
    });
  });

  const rules = [
    ...selectedRules.flatMap((rule) =>
      rule.site.map((site) => `RULE-SET,${site},${rule.group}`)
    ),
    ...selectedRules.flatMap((rule) =>
      rule.ip.map((ip) => `RULE-SET,${ip}-ip,${rule.group},no-resolve`)
    ),
    `MATCH,${names.fallback}`,
  ];

  return {
    port: 7890,
    "socks-port": 7891,
    "allow-lan": false,
    mode: "rule",
    "log-level": "info",
    "geodata-mode": true,
    "geo-auto-update": true,
    "geodata-loader": "standard",
    "geo-update-interval": 24,
    "geox-url": {
      geoip: "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geoip.dat",
      geosite: "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geosite.dat",
      mmdb: "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/country.mmdb",
      asn: "https://github.com/xishang0128/geoip/releases/download/latest/GeoLite2-ASN.mmdb",
    },
    dns: {
      enable: true,
      ipv6: true,
      "respect-rules": true,
      "enhanced-mode": "fake-ip",
      nameserver: [
        "https://120.53.53.53/dns-query",
        "https://223.5.5.5/dns-query",
      ],
      "proxy-server-nameserver": [
        "https://120.53.53.53/dns-query",
        "https://223.5.5.5/dns-query",
      ],
      "nameserver-policy": {
        "geosite:cn,private": [
          "https://120.53.53.53/dns-query",
          "https://223.5.5.5/dns-query",
        ],
        "geosite:geolocation-!cn": [
          "https://dns.cloudflare.com/dns-query",
          "https://dns.google/dns-query",
        ],
      },
    },
    proxies,
    "proxy-providers": proxyProviders,
    "proxy-groups": proxyGroups,
    "rule-providers": ruleProviders,
    rules,
  };
}

function unique(items) {
  return Array.from(new Set(items.filter(Boolean)));
}
