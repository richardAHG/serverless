const AWS = require("aws-sdk");

listar = async (event) => {
  const { limit = 10, lastKey } = event.queryStringParameters || {};
  try {
    const dynamoDB = new AWS.DynamoDB.DocumentClient();
    const table = "fusionadosTable";
    const params = {
      TableName: table,
      Limit: parseInt(limit, 10),
    };

    if (lastKey) {
      params.ExclusiveStartKey = JSON.parse(lastKey);
    }

    const result = await dynamoDB.scan(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Listado",
        data: result?.Items,
        lastEvaluatedKey: result.LastEvaluatedKey,
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
