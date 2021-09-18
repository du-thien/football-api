const today = new Date();
const todayGMT = today.toGMTString();

s5Header = {
  Authorization: "stats.fn.sportradar.com",
  Referer: "https://s5.sir.sportradar.com/",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36",
  "accept-encoding": "gzip, deflate, br",
  "accept-language": "en-US,en;q=0.9,vi;q=0.8",
  //   "if-modified-since": `${todayGMT}`,
  origin: "https://s5.sir.sportradar.com",
  referer: "https://s5.sir.sportradar.com/",
  "sec-ch-ua":
    '"Chromium";v="92", " Not A;Brand";v="99", "Google Chrome";v="92"',
  "sec-ch-ua-mobile": "?0",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-site",
};

bongdaHeader = {
  Authorization: "http://bongda.wap.vn/",
  Referer: "http://bongda.wap.vn/",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36",
  "accept-encoding": "gzip, deflate, br",
  "accept-language": "en-US,en;q=0.9,vi;q=0.8",
  origin: "https://s5.sir.sportradar.com",
  referer: "https://s5.sir.sportradar.com/",
  "sec-ch-ua":
    '"Chromium";v="92", " Not A;Brand";v="99", "Google Chrome";v="92"',
  "sec-ch-ua-mobile": "?0",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-site",
};

fbHeader = {
  "X-Auth-Token": "fbb17532db6b432ebbb33aa3fdbd40c9",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36",
};

module.exports = {
  s5Header,
  bongdaHeader,
  fbHeader,
};
