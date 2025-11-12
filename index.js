const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT;

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>middle-ware-connection<<<<<<<<<<<<<<<<<<<<<<<<
app.use(cors());
app.use(express.json());

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>DATABASE_CONNECTION_MONGODB_<<<<<<<<<<<<<<<<<<<<<<<<<<<<
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hc5ykgf.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const db = client.db("importExportBD");
    const productsCollection = db.collection("products");
    const usersCollection = db.collection("users");
    const importsCollection = db.collection("imports");
    // >>>>>>>>>>>>>>>>>>>>> USERS-API <<<<<<<<<<<<<<<<<<<<<<<<<<<
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const email = req.body.email;
      const query = { email: email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        res.send({
          message: "user already exits. do not need to insert again",
        });
      } else {
        const result = await usersCollection.insertOne(newUser);
        res.send(result);
      }
    });
    // >>>>>>>>>>>>>>>>>>>>> IMPORT-PRODUCT-API <<<<<<<<<<<<<<<<<<<<<<<<<<<
    app.post("/import", async (req, res) => {
      try {
        const { productId, quantity, userEmail } = req.body;

        if (!productId || !quantity || quantity <= 0 || !userEmail) {
          return res.status(400).send({ message: "Invalid input data" });
        }

        const query = { _id: new ObjectId(productId) };
        const product = await productsCollection.findOne(query);

        if (!product)
          return res.status(404).send({ message: "Product not found" });
        if (quantity > product.availableQuantity) {
          return res
            .status(400)
            .send({ message: "Import quantity exceeds available stock" });
        }

        // Decrease quantity
        await productsCollection.updateOne(query, {
          $inc: { availableQuantity: -quantity },
        });

        // Save import record
        const importRecord = {
          userEmail,
          productId: product._id,
          productName: product.productName,
          productImage: product.productImage,
          price: product.price,
          originCountry: product.originCountry,
          importQuantity: quantity,
          importedAt: new Date(),
        };
        await importsCollection.insertOne(importRecord);

        res.send({
          success: true,
          message: "Product imported successfully",
          importRecord,
        });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Internal server error" });
      }
    });
    // GET IMPORTS FOR USER
    app.get("/imports/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const userImports = await importsCollection
          .find({ userEmail: email })
          .toArray();
        res.send(userImports);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Internal server error" });
      }
    });
    // >>>>>>>>>>>>>>>>>>>>> PRODUCTS-COLLECTION-API <<<<<<<<<<<<<<<<<<<<<<<<<<<
    app.get("/products", async (req, res) => {
      const products = await productsCollection.find().toArray();
      res.send(products);
    });
    app.get("/latestProduct", async (req, res) => {
      const result = await productsCollection
        .find()
        .sort({ created_at: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });
    // hello
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.findOne(query);
      res.send(result);
    });
    app.post("/products", async (req, res) => {
      const newProduct = req.body;
      const result = await productsCollection.insertOne(newProduct);
      res.send(result);
    });
    app.patch("/products/:id", async (req, res) => {
      const id = req.params.id;
      const updatedProductInfo = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {};
      const result = await productsCollection.updateOne(query, update);
      res.send(result);
    });
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
app.get("/", (req, res) => {
  res.send("server is running");
});
app.listen(port, (req, res) => {
  console.log("YOUR SERVER IS RUNNING ON PORT : ", port);
});
