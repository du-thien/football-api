const axios = require("../../plugins/axios");
const { downloadImage } = require("../../utils/downloadImage");
const mime = require("mime-types");
const { s5Header } = require("../../constants/headers");

module.exports = {
  async sync(ctx) {
    try {
      const res = await axios.get(`${process.env.S5_URL}/config_tree_mini/41/0/1`, {
        headers: s5Header
       });
      const data = res.data.doc[0].data[0].realcategories;
      const countries = await Promise.all(
        data.map(async ({ _id, name, cc }) => {
          if (cc) {
            await downloadImage(
              `${process.env.IMAGE_URL}/${cc.a2}.png`,
              `public/flags/${cc.a2}.png`
            );
          }
          return {
            country_id: _id,
            country_name: name,
            flag: !cc ? null : `${cc.a2}.png`,
            continent_id: !cc ? null : cc.continentid,
            continent_name: !cc ? null : cc.continent,
          };
        })
      );

      await Promise.all(
        countries.map(async (country) => {
          const countryExist = await strapi.services.country.findOne({
            country_id: country.country_id,
          });
          if (countryExist) {
            await strapi.services.country.update(
              { country_id: country.country_id },
              country
            );
          } else {
            await strapi.services.country.create(country);
          }
        })
      );

      ctx.send({
        message: "sync success",
      });
    } catch (error) {
      console.log(error);
    }
  },

  async upload(ctx) {
    // const image = await axios.get(imageUrl).then((res) => {
    //   console.log(res);
    // });
    // const buffers = await strapi.plugins.upload.services.upload.bufferize({
    //   buffer: image,
    //   name: "logo.png",
    //   mime: "image/png",
    //   size: 20000,
    // });
    // const uploadedFiles = await strapi.plugins.upload.services.upload.upload(
    //   buffers,
    //   {
    //     provider: "local",
    //     name: "Local server",
    //     enabled: true,
    //     sizeLimit: 1000000,
    //   }
    // );
    // axios.get(imageUrl).then((response) => {
    //   const data = new FormData();
    //   data.append("files", {
    //     uri: logo.uri,
    //     name: `test.jpg`,
    //     type: "multipart/form-data",
    //   });
    //   data.append("refId", 1);
    //   data.append("ref", "country");
    //   data.append("field", "flag");
    //   axios("http://localhost:1337/upload", {
    //     method: "POST",
    //     body: data,
    //   })
    //     .then((response) => {
    //       const result = response.json();
    //       console.log("result", result);
    //     })
    //     .catch(function (err) {
    //       console.log("error:");
    //       console.log(err);
    //     });
    //   });
  },
};
