# Backend REST API Documentation

## Overview
This repository contains the codebase for a backend REST API designed to handle Songs and Lists of songs for proyecto vertigo. Built using Node.js with Express and MongoDB, this API is designed for scalability, reliability, and performance.

---

## Getting Started

### Prerequisites
Make sure you have the following installed:
- Node.js v21 or higher
- Database, e.g., MongoDB
- Docker

### Installation
1. Clone the repository:
    ```bash
    git clone https://github.com/yourusername/your-repo.git
    cd your-repo
    ```
2. Install dependencies preferably using yarn:
    ```bash
    yarn install
    ```

3. Set up environment variables:
    - Create a `.env` file in the root directory.
    - Add the following:
      ```env
      MONGO_URI
      GOOGLE_CLOUD_PROJECT
      FIRESTORE_DATABASE_ID
      ```

### Running the Server
1. Start the development server:
    ```bash
    yarn dev
    ```
2. Access the API at `http://localhost:3001`.

---

## API Endpoints

### Songs
| Method | Endpoint           | Description             |
|--------|--------------------|-------------------------|
| GET    | `/api/songs`    | Retrieve all songs  |
| POST   | `/api/songs`    | Create a new song   |
| GET    | `/api/songs/:id`| Get song by id    |

### Lists
| Method | Endpoint           | Description             |
|--------|--------------------|-------------------------|
| GET    | `/api/lists`    | Retrieve all lists  |
| POST   | `/api/lists`    | Create a new list   |
| GET    | `/api/lists/:id`| Get a list by id       |

### Error Codes
| Code | Description                  |
|------|------------------------------|
| 200  | Success                      |
| 400  | Bad Request                  |
| 401  | Unauthorized                 |
| 404  | Not Found                    |
| 500  | Internal Server Error        |

---

## Testing

### Running Tests
1. Run the test suite:
    ```bash
    yarn test
    ```
2. View test results in the console.

---

## Deployment

### Using Docker
1. Build the Docker image:
    ```bash
    docker build -t your-image-name .
    ```
2. Run the container:
    ```bash
    docker run -p 8000:8000 your-image-name
    ```

### Manual Deployment
1. Install dependencies on the server.
2. Set up environment variables.
3. Start the server in production mode:
    ```bash
    [Command, e.g., npm start]
    ```

---

## Contributing
1. Fork the repository.
2. Create a new branch for your feature:
    ```bash
    git checkout -b feature-name
    ```
3. Commit your changes:
    ```bash
    git commit -m "Description of changes"
    ```
4. Push to your branch:
    ```bash
    git push origin feature-name
    ```
5. Open a pull request.

---

## License
[License Name, e.g., MIT License]

---

## Acknowledgments
- [List contributors, libraries, or tools you want to acknowledge.]



