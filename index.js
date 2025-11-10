// import package
require('dotenv').config();
const express = require('express')
const app = express()
var cors = require('cors')
const port = process.env.PORT;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


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


// MongoDB connection
async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const db = client.db("StudyMate")
        const partnerCollection = db.collection("partner")

        // get METHOD
        app.get("/partner", async (req, res) => {
            const result = await partnerCollection.find().toArray();
            res.send(result)
        })

        // Top partner Sort 3 card and rating 
        app.get("/top-Partner", async (req, res) => {
            const result = await partnerCollection.find().sort({ rating: -1 }).limit(4).toArray()
            res.send(result)
        })

        // Sort rating
        // app.get("/rating", async (req, res) => {
        //     const result = await partnerCollection.find().sort({ rating: -1 }).toArray()
        //     res.send(result)
        // })



        // Note: https://chatgpt.com/share/6911db17-1b24-8013-991d-01b474aff31f

        // Sort Experience low
        app.get("/experience", async (req, res) => {
            const result = await partnerCollection.aggregate([
                {
                    $addFields: {
                        experienceOrder: {
                            $switch: {
                                branches: [
                                    { case: { $eq: ["$experienceLevel", "Beginner"] }, then: 1 },
                                    { case: { $eq: ["$experienceLevel", "Intermediate"] }, then: 2 },
                                    { case: { $eq: ["$experienceLevel", "Expert"] }, then: 3 }
                                ],
                                default: 4
                            }
                        }
                    }
                }, { $sort: { experienceOrder: 1 } }
            ]).toArray()
            res.send(result)
        })

        // Sort Experience high
        app.get("/experienceHigh", async (req, res) => {
            const result = await partnerCollection.aggregate([{
                $addFields: {
                    experienceOrder: {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$experienceLevel", "Beginner"] }, then: 1 },
                                { case: { $eq: ["$experienceLevel", "Intermediate"] }, then: 2 },
                                { case: { $eq: ["$experienceLevel", "Expert"] }, then: 3 }
                            ],
                            default: 4
                        }
                    }
                }
            }, { $sort: { experienceOrder: -1 } }
            ]).toArray();
            res.send(result)
        })

        // // Sort Name
        // app.get("/name", async (req, res) => {
        //     const result = await partnerCollection.find().sort({ name: 1 }).toArray()
        //     res.send(result)
        // })

        // Search filter name, location, subject, experience
        app.get("/search", async (req, res) => {
            const search_text = req.query.search;
            const result = await partnerCollection.find({
                $or: [
                    // { name: { $regex: search_text, $options: "i" } },
                    { subject: { $regex: search_text, $options: "i" } },
                    // { studyMode: { $regex: search_text, $options: "i" } },
                    // { experienceLevel: { $regex: search_text, $options: "i" } },
                    // { location: { $regex: search_text, $options: "i" } },
                ]
            }).toArray()
            res.send(result)
        })

        app.get("/partner/:id", async (req, res) => {
            const result = await partnerCollection.findOne({ _id: new ObjectId(req.params.id) })
            res.send(result)
        })

        // post METHOD
        app.post("/partner", async (req, res) => {
            console.log(req.body);
            const result = await partnerCollection.insertOne(req.body)
            res.send(result)
        })

        // patch OR put METHOD

        // delete METHOD
        app.delete("/partner/:id", async (req, res) => {
            const result = await partnerCollection.deleteOne({ _id: new ObjectId(req.params.id) })
            res.send(result)
        })

        // server run check
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


// app published
app.listen(port, () => {
    console.log(`Study mate server is running to now port: ${port}`)
})