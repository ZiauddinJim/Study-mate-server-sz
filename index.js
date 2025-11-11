// import package
require('dotenv').config();
const express = require('express')
const app = express()
var cors = require('cors')
const port = process.env.PORT;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const admin = require("firebase-admin");

const serviceAccount = require("./firebase-adminSdk.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


// Middleware
app.use(cors());
app.use(express.json());

// Section: Firebase verify middleware
const firebaseVerifyToken = async (req, res, next) => {
    // console.log(req.headers.authorization);
    // console.log("i am from firebase middleware.");
    if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorize request!" })
    }
    const token = req.headers.authorization.split(" ")[1]
    // console.log(token);
    if (!token) {
        return res.status(401).send({ message: "Token is not authorize!" })
    }
    // verify id token
    try {
        const tokenInfo = await admin.auth().verifyIdToken(token)
        req.token_email = tokenInfo.email;
        // console.log("after token validation:", tokenInfo);
        next()
    } catch (error) {
        console.log(error);
        return res.status(401).send({ message: "Token is not authorize!" })
    }

}


// Connect MongoDB
// const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASSWORD}@cluster0.cfeguho.mongodb.net/?appName=Cluster0`;
const uri = "mongodb://localhost:27017"
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
        // Connect the client to the server	(optional starting in v4.7)  Section:
        await client.connect();
        const db = client.db("StudyMate")
        const partnerCollection = db.collection("partner")
        const connectionCollection = db.collection("connection")

        // get METHOD  Section:
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
        app.get("/rating", async (req, res) => {
            const result = await partnerCollection.find().sort({ rating: -1 }).toArray()
            res.send(result)
        })



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

        // Sort Name
        app.get("/name", async (req, res) => {
            const result = await partnerCollection.find().sort({ name: 1 }).toArray()
            res.send(result)
        })

        // Search filter name, location, subject, experience
        app.get("/search", async (req, res) => {
            const search_text = req.query.search;
            const result = await partnerCollection.find({
                $or: [
                    { name: { $regex: search_text, $options: "i" } },
                    { subject: { $regex: search_text, $options: "i" } },
                    { studyMode: { $regex: search_text, $options: "i" } },
                    { experienceLevel: { $regex: search_text, $options: "i" } },
                    { location: { $regex: search_text, $options: "i" } },
                ]
            }).toArray()
            res.send(result)
        })

        app.get("/partner/:id", firebaseVerifyToken, async (req, res) => {
            const result = await partnerCollection.findOne({ _id: new ObjectId(req.params.id) })
            res.send(result)
        })

        app.get("/my-connection", firebaseVerifyToken, async (req, res) => {
            const email = req.query.email;
            if (!email) {
                return res.status(400).send({ message: "Email query is required" });
            }
            if (email !== req.token_email) {
                return res.status(403).send({ message: "forbidden access try!" });
            }
            const result = await connectionCollection.find({ connectionBy: email }).toArray();
            res.send(result);
        });


        // post METHOD  Section:
        app.post("/partner", firebaseVerifyToken, async (req, res) => {
            // console.log(req.body);
            const result = await partnerCollection.insertOne(req.body)
            res.send(result)
        })

        app.post("/connection", async (req, res) => {
            const { partnerId } = req.body
            const existingConnection = await connectionCollection.findOne({ partnerId: partnerId })
            if (existingConnection) {
                res.status(400).send({ message: "Already Connected This Partner", existingConnection })
            } else {
                const result = await connectionCollection.insertOne(req.body)
                res.send(result)
            }

        })

        // patch OR put METHOD  Section:

        // partner details count update
        app.patch("/partner-count/:id", firebaseVerifyToken, async (req, res) => {
            const filter = { _id: new ObjectId(req.params.id) }
            const update = { $inc: { partnerCount: 1 } }
            const partnerCount = await partnerCollection.updateOne(filter, update)
            res.send(partnerCount)
        })

        // connection partner details update
        app.patch("/connection/:id", async (req, res) => {
            const filter = { _id: new ObjectId(req.params.id) }
            const productUpdate = req.body
            const update = { $set: productUpdate }
            const result = await connectionCollection.updateOne(filter, update)
            res.send(result)
        })

        // delete METHOD  Section:
        // partner 
        app.delete("/connection/:id", firebaseVerifyToken, async (req, res) => {
            const result = await connectionCollection.deleteOne({ _id: new ObjectId(req.params.id) })
            res.send(result)
        })

        // app.delete("/my-connection/:id",async(req,res)=>{
        //     const result= await connectionCollection.deleteOne({_id:})
        //     res.send(result)
        // })

        // server run check  Section:
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