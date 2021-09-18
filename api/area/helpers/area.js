const { sanitizeEntity } = require("strapi-utils");

const insertChildAreas = async (data, parentId) => {
  const childAreas = data.filter((area) => area.parentAreaId === parentId);
  return await Promise.all(
    childAreas.map(async (area) => {
      const { id, name, countryCode, ensignUrl, parentAreaId, parentArea } =
        area;
      let entity = await strapi.services.area.findOne({ areaId: id });

      if (!entity) {
        entity = await strapi.services.area.create({
          areaId: id,
          name,
          countryCode,
          img: ensignUrl,
          parentAreaId,
          parentArea,
        });
      }
      return sanitizeEntity(entity, { model: strapi.models.area });
    })
  );
};

const insertParentAreas = async (area, childAreas) => {
  const { id, name, countryCode, ensignUrl, parentAreaId, parentArea } = area;
  let entity = await strapi.services.area.findOne({ areaId: area.id });
  if (!entity) {
    entity = await strapi.services.area.create({
      areaId: id,
      name,
      countryCode,
      img: ensignUrl,
      parentAreaId,
      parentArea,
      childAreas,
    });
  }
  return sanitizeEntity(entity, { model: strapi.models.area });
};

const insertManyAreas = async (data) => {
  try {
    const world = data.filter((area) => area.parentAreaId === null)[0];
    const { id, name, countryCode, ensignUrl, parentAreaId, parentArea } =
      world;

    const parents = data.filter((area) => area.parentAreaId === id);

    const areas = await Promise.all(
      parents.map(async (parent) => {
        const childAreas = await insertChildAreas(data, parent.id);
        return await insertParentAreas(parent, childAreas);
      })
    );

    await strapi.services.area.create({
      areaId: id,
      name,
      countryCode,
      img: ensignUrl,
      parentAreaId,
      parentArea,
      childAreas: areas,
    });

    return {
      message: "sync areas success",
      status: 200,
    };
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  insertManyAreas,
};
