const { appAxios } = require("../appAxios");
const fs = require("fs");

module.exports = {
  async downloadImage(url, image_path) {
    await appAxios({
      url,
      responseType: "stream",
    }).then(
      (response) =>
        new Promise((resolve, reject) => {
          response.data
            .pipe(fs.createWriteStream(image_path))
            .on("finish", () => resolve())
            .on("error", (e) => reject(e));
        })
    );
  },
};
