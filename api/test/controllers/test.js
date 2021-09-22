"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async testInsert(ctx) {
    for (var i = 0; i < 100000; i++) {
       strapi.query("test").create({ name: `test ${i}` });
    }
    ctx.send({
        status : "done"
    })
  },
};
