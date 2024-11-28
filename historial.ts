import { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import AWS from "aws-sdk";

interface QueryStringParameters {
  limit?: string;
  lastKey?: string;
}

interface ResponseBody {
  message: string;
  data?: AWS.DynamoDB.DocumentClient.ItemList;
  lastEvaluatedKey?: AWS.DynamoDB.DocumentClient.Key;
  error?: string;
}

// Handler
export const listar: APIGatewayProxyHandler = async (event) => {
  const { limit = "10", lastKey }: QueryStringParameters =
    event.queryStringParameters || {};

  try {
    const dynamoDB = new AWS.DynamoDB.DocumentClient();
    const table = "fusionadosTable";

    // Configurar parámetros de DynamoDB
    const params: any = {
      TableName: table,
      Limit: parseInt(limit, 10),
    };

    if (lastKey) {
      params.ExclusiveStartKey = JSON.parse(lastKey);
    }

    // Realizar la operación de escaneo
    const result = await dynamoDB.scan(params).promise();

    const responseBody: ResponseBody = {
      message: "Listado",
      data: result.Items,
      lastEvaluatedKey: result.LastEvaluatedKey,
    };

    const response: APIGatewayProxyResult = {
      statusCode: 200,
      body: JSON.stringify(responseBody),
    };

    return response;
  } catch (error) {
    const responseBody: ResponseBody = {
      message:
        error instanceof Error ? error.message : "Ocurrió un error inesperado",
      error: error instanceof Error ? error.stack : undefined,
    };

    const response: APIGatewayProxyResult = {
      statusCode: 500,
      body: JSON.stringify(responseBody),
    };

    return response;
  }
};
