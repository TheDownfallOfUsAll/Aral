# Spring Boot Item CRUD API

This standalone backend implements CRUD operations for the `item` table in the
`dbCRUD1` MySQL database. The repository's existing Node API remains unchanged.

## Requirements and setup

- Java 17 or newer
- Maven 3.6.3 or newer
- MySQL with a database named `dbCRUD1`

Set the MySQL password in the environment rather than storing it in this project:

```powershell
$env:DB_USERNAME = "root"
$env:DB_PASSWORD = "your-local-mysql-password"
```

Optionally set `DB_URL` or `FRONTEND_ORIGIN` to override the defaults in
`src/main/resources/application.properties`. Hibernate creates or updates the
`item` table when the application starts.

From this directory, start the API with:

```powershell
mvn spring-boot:run
```

The API listens on port 8080. Request bodies for create and update use JSON such
as `{"name":"Pencil","unit":"piece","price":1.5}`.

## Endpoints

| Operation | Method and path |
|---|---|
| Author | `GET /item/api/printAuthor` |
| Create item | `POST /item/api/postNewItem` |
| List items | `GET /item/api/getAllItems` |
| Update item | `PUT /item/api/putItem?id=1` |
| Delete item | `DELETE /item/api/deleteItem/1` |

Invalid item fields return `400`; updating or deleting an unknown item returns
`404` with a JSON error response.
