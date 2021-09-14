const axios = require("../../plugins/axios");
const { sanitizeEntity } = require("strapi-utils");

module.exports = {
  async findOne(ctx) {
    const { id } = ctx.params;
    const res = await axios.get(`${process.env.S5_URL}/config_tree_mini/41/0/1/${id}`, {
      headers: s5Header
     });
    const { tournaments, uniquetournaments } =
      res.data.doc[0].data[0].realcategories[0];

    const Uids = [];
    tournaments.map((league) => {
      if (league.seasonid === league.currentseason) {
        Uids.push(league._utid);
      }
    });

    const leagues = await Promise.all(
      Uids.map(async (uid) => {
        let league = await strapi.services.league.findOne({ league_id: uid });
        if (!league) {
          const _ = uniquetournaments[uid];
          league = await strapi.services.league.create({
            league_id: _._id,
            league_name: _.name,
            country_id: id,
          });
        }
        return league;
      })
    );

    return leagues.map((league) =>
      sanitizeEntity(league, { model: strapi.models.league })
    );
  },
};
