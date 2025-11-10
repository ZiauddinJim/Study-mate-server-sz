// import package
require('dotenv').config();
const express = require('express')
const app = express()
const port = process.env.PORT;
const { MongoClient, ServerApiVersion } = require('mongodb');


// Middleware
app.use(cors());
app.use(express.json());


// Connect MongoDB
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASSWORD}@cluster0.cfeguho.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// app run
app.get('/', (req, res) => {
    res.send('This is my Study mate server!')
})



// app published
app.listen(port, () => {
    console.log(`Study mate server is running to now port: ${port}`)
})