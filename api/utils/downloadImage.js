const axios = require("../plugins/axios");
const fs = require("fs");

module.exports = {
  async downloadImage(url, imagePath) {
    try {
      const imageName = imagePath.substring(imagePath.lastIndexOf("/") + 1);
      const folder = imagePath.replace(imageName, "");
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder);
      }
      if (!fs.existsSync(`${folder}/${imageName}`)) {
        console.log(`[DOWNLOADING]: ${imageName}`);
        await axios({
          url,
          responseType: "stream",
        }).then((response) => {
          new Promise((resolve, reject) => {
            response.data
              .pipe(fs.createWriteStream(`${folder}/${imageName}`))
              .on("finish", () => {
                resolve();
                console.log(`[DOWNLOADED]: ${imageName}`);
              })
              .on("error", (e) => console.error(`${e.message}`));
          });
        });
      }
      new Promise((resolve, _) => resolve());
    } catch (error) {
      console.error(`${error.message} with ${url}`);
    }
  }
};
