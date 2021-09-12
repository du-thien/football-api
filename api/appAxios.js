const axios = require("axios");

let BASE_URL = process.env.API_URL;

const appAxios = axios.create({
  baseURL: BASE_URL,
});

appAxios.interceptors.request.use(
  async (config) => {
    config.headers = {
      referer: "https://s5.sir.sportradar.com/",
      "sec-ch-ua":
        '"Google Chrome";v="93", " Not;A Brand";v="99", "Chromium";v="93"',
      "sec-ch-ua-mobile": "?0",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36",
    };
    return config;
  },
  (error) => {
    Promise.reject(error);
  }
);

axios.interceptors.response.use(function (response) {
  return response;
}, function (error) {
  return Promise.reject(error);
});

module.exports = {
  appAxios,
};
