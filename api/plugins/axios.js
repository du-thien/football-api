const axios = require("axios");

// Add a request interceptor
axios.interceptors.request.use(
  async (config) => {
    // console.log(config);
    return config;
  },
  (error) => {
    console.log(error.message);
    // Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (response) => {
    if (response.status !== 200) {
      console.debug(response.config);
    }
    return response;
  },
  (error) => {
    if (
      error != null &&
      (error.code === "ENETUNREACH" || error.code === "ECONNABORTED")
    ) {
      return {
        data: {
          code: 502,
          status: "SHOW_MESSAGE",
          message: "Không thể kết nối máy chủ, Vui lòng thử lại sau",
        },
      };
    }
    // console.log(`Axios error : ${JSON.stringify(error)}`);
    return {
      data: {
        code: 520,
        status: "UNKNOWN_ERROR",
        message: "Lỗi chưa xác định",
      },
    };
  }
);
module.exports = axios;
