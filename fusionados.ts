import {
  APIGatewayProxyHandler,
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from "aws-lambda";
import AWS from "aws-sdk";
import axios from "axios";

// Constantes
const CACHE_EXPIRATION_TIME = 30 * 60; // 30 minutos en segundos
const cacheTable = "cacheTable";
const fusionadosTable = "fusionadosTable";

// Configuración de DynamoDB
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Interfaces para tipado
interface Person {
  id?: string;
  name: string;
  height: string;
  mass: string;
  hair_color: string;
  skin_color: string;
  eye_color: string;
  birth_year: string;
  gender: string;
  homeworld: string;
  films: string[];
  species: string[];
  vehicles: string[];
  starships: string[];
  created: string;
  edited: string;
  url: string;
  planet?: any;
}

interface CacheItem {
  id: string;
  data: string;
  timestamp: number;
  ttl: number;
}

interface ResponseBody {
  data?: Person;
  message: string;
  error?: string;
}

// Función HTTP
const httpRequest = async (url: string): Promise<any> => {
  try {
    console.log(`Realizando petición HTTP a: ${url}`);
    const response = await axios.get(url);
    console.log(`Respuesta obtenida de ${url}:`, response.data);
    return response.data;
  } catch (error: any) {
    console.error(`Error al obtener la data de ${url}: ${error.message}`);
    throw new Error(`Error al obtener la data de ${url}, ${error.message}`);
  }
};

// Guardar en caché
const saveCache = async (key: string, data: any): Promise<void> => {
  try {
    console.log(`Guardando datos en la caché para key: ${key}`);
    const cacheItem: CacheItem = {
      id: key,
      data: JSON.stringify(data),
      timestamp: Math.floor(Date.now() / 1000),
      ttl: Math.floor(Date.now() / 1000) + CACHE_EXPIRATION_TIME,
    };

    await dynamoDB
      .put({
        TableName: cacheTable,
        Item: cacheItem,
      })
      .promise();
  } catch (error: any) {
    console.error(`Error guardando en caché: ${error.message}`);
    throw error;
  }
};

// Obtener de caché
const getCache = async (key: string): Promise<Person | null> => {
  console.log(`Obteniendo datos de la caché para key: ${key}`);
  try {
    const result = await dynamoDB
      .get({
        TableName: cacheTable,
        Key: { id: key },
      })
      .promise();

    return result.Item ? JSON.parse(result.Item.data) : null;
  } catch (error: any) {
    console.error(`Error al obtener de cacheTable: ${error.message}`);
    throw error;
  }
};

// Insertar o actualizar en la tabla fusionados
const insertOrUpdate = async (
  people_id: string,
  people: Person
): Promise<void> => {
  try {
    console.log(`Verificando si existe key: ${people_id}`);
    const exist = await dynamoDB
      .get({
        TableName: fusionadosTable,
        Key: { id: people_id },
      })
      .promise();

    if (exist?.Item) {
      const updateExpression: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

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
      console.log(`Actualización realizada para key: ${people_id}`);
    } else {
      await dynamoDB
        .put({
          TableName: fusionadosTable,
          Item: { id: people_id, ...people },
        })
        .promise();
      console.log(`Inserción realizada para key: ${people_id}`);
    }
  } catch (error: any) {
    console.error(
      `Error en insertOrUpdate para key: ${people_id}, ${error.message}`
    );
    throw new Error(`Error en insertOrUpdate: ${error.message}`);
  }
};

// Handler de Lambda
export const listar: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { people_id } = event.pathParameters || {};

  if (!people_id) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "El parámetro people_id es requerido.",
      }),
    };
  }

  try {
    const cachedData = await getCache(people_id);
    let people: Person;

    if (!cachedData) {
      people = await httpRequest(
        `https://swapi.py4e.com/api/people/${people_id}`
      );

      if (people?.homeworld) {
        try {
          people.planet = await httpRequest(people.homeworld);
        } catch (error: any) {
          console.error(`Error al obtener el planeta: ${error.message}`);
          people.planet = null;
        }
      }

      await saveCache(people_id, people);
    } else {
      people = cachedData;
    }

    await insertOrUpdate(people_id, people);

    const responseBody: ResponseBody = {
      data: people,
      message: "Datos obtenidos",
    };

    return {
      statusCode: 200,
      body: JSON.stringify(responseBody),
    };
  } catch (error: any) {
    const responseBody: ResponseBody = {
      message: error.message || "Ocurrió un error inesperado",
      error: error.stack,
    };

    return {
      statusCode: 500,
      body: JSON.stringify(responseBody),
    };
  }
};
