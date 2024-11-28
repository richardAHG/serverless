const http = require("axios");
const AWS = require("aws-sdk");

const CACHE_EXPIRATION_TIME = 30 * 60; // 30 minutos en segundos
const cacheTable = "cacheTable";
const fusionadosTable = "fusionadosTable";

const dynamoDB = new AWS.DynamoDB.DocumentClient();

const httpRequest = async (url) => {
  try {
    console.log(`Realizando petición HTTP a: ${url}`);
    const request = await http.get(url);
    console.log(`Respuesta obtenida de ${url}:`, request.data);
    return request.data;
  } catch (error) {
    console.error(`Error al obtener la data de ${url}: ${error?.message}`);
    throw new Error(`Error al obtener la data de ${url}, ${error?.message}`);
  }
};

const saveCache = async (key, data) => {
  try {
    console.log(`Guardando datos en la caché para key: ${key}`);
    await dynamoDB
      .put({
        TableName: cacheTable,
        Item: {
          id: key,
          data: JSON.stringify(data),
          timestamp: Math.floor(Date.now() / 1000),
          ttl: Math.floor(Date.now() / 1000) + CACHE_EXPIRATION_TIME,
        },
      })
      .promise();
  } catch (error) {
    console.error(`Error guardando en caché: ${error?.message}`);
    throw error;
  }
};

const getCache = async (people_id) => {
  console.log(`obteniendo datos de la caché para key: ${people_id}`);
  try {
    const result = await dynamoDB
      .get({
        TableName: cacheTable,
        Key: { id: people_id },
      })
      .promise();

    return result.Item ? JSON.parse(result.Item.data) : null;
  } catch (error) {
    console.error(
      `Error al obtener de cacheTable: ${error?.message},  ${error?.stack}`
    );
    throw error;
  }
};

const insertOrUpdate = async (people_id, people) => {
  try {
    console.log(`verificar si existe key: ${people_id}`);
    const exist = await dynamoDB
      .get({
        TableName: fusionadosTable,
        Key: { id: people_id },
      })
      .promise();

    if (exist?.Item) {
      const updateExpression = [];
      const expressionAttributeNames = {};
      const expressionAttributeValues = {};

      for (const [field, value] of Object.entries(people)) {
        if (field === "id") continue; // Ignorar la clave primaria
        updateExpression.push(`#${field} = :${field}`);
        expressionAttributeNames[`#${field}`] = field;
        expressionAttributeValues[`:${field}`] = value;
      }

      await dynamoDB
        .update({
          TableName: fusionadosTable,
          Key: { id: people_id }, 
          UpdateExpression: `SET ${updateExpression.join(", ")}`,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: "ALL_NEW",
        })
        .promise();
      console.log(`update para key: ${people_id}`);
    } else {
      await dynamoDB
        .put({ TableName: fusionadosTable, Item: { id: people_id, ...people } })
        .promise();
      console.log(`insert para key: ${people_id}`);
    }
  } catch (error) {
    console.error(
      `error en insertOrUpdate para key: ${people_id}, ${error?.message},${error?.stack}`
    );
    throw new Error(`Error en insertOrUpdate: ${error?.message}`);
  }
};

listar = async (event) => {
  const { people_id } = event.pathParameters;

  try {
    const cachedData = await getCache(people_id);
    let people;
    if (!cachedData) {
      people = await httpRequest(
        `https://swapi.py4e.com/api/people/${people_id}`
      );

      if (people?.homeworld) {
        try {
          people.planet = await httpRequest(people.homeworld);
        } catch (error) {
          console.error(`Error al obtener el planeta: ${planetError.message}`);
          people.planet = null;
        }
      }

      await saveCache(people_id, people);
    } else {
      people = cachedData;
    }

    await insertOrUpdate(people_id, people);

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: people,
        message: "Datos obtenidos",
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error?.stack,
        message: error?.message || "Ocurrió un error inesperado",
      }),
    };
  }
};

module.exports = { listar };
