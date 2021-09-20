const axios = require("../../plugins/axios");
const { fbHeader } = require("../../constants/headers");
const { insertManyAreas } = require("../helpers/area");
module.exports = {
  async sync(ctx) {
    try {
      const res = await axios.get(`${process.env.FB_URL}/areas`, {
        headers: fbHeader,
      });
      const { areas } = res.data;
      const result = await insertManyAreas(areas);
      ctx.send(result);
    } catch (error) {
      console.log(error.message);
    }
  },
};
