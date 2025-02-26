const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gqz9f.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // MongoDB Database Collections
    const userCollection = client.db('petAdoption').collection('users');
    const petsCollection = client.db('petAdoption').collection('pets');
    const adoptionsCollection = client.db('petAdoption').collection('adoptions');
    const donationCampaignsCollection = client.db('petAdoption').collection('donationCampaigns');
    const paymentCollection = client.db('petAdoption').collection('payments');

    // JWT APIs
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    });

    // Verify Token Middleware
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'Unauthorized Access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'Unauthorized Access' });
        }
        req.decoded = decoded;
        next();
      });
    };

    // Verify Admin Middleware
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'Forbidden Access' });
      }
      next();
    };

    // User-related APIs
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'User already exists', insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get('/users', verifyToken, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    });

    // Pets-related APIs
    app.get('/pets', async (req, res) => {
      const filter = req.query.filter;
      const search = req.query.search ? String(req.query.search).trim() : "";
      const adopted = req.query.adopted === 'true';

      let query = {
        name: { $regex: search, $options: 'i' },
        adopted: adopted
      };

      if (filter) query.category = filter;

      try {
        const result = await petsCollection.find(query).sort({ addedAt: -1 }).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: 'Failed to fetch pets' });
      }
    });

    app.get('/pets/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const singlePet = await petsCollection.findOne(query);
      res.send(singlePet);
    });

    app.get('/pets/category/:name', async (req, res) => {
      const categoryName = req.params.name;
      const query = { category: categoryName };
      const result = await petsCollection.find(query).toArray();
      res.send(result);
    });

    app.get('/pets/user/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email };
      const result = await petsCollection.find(query).toArray();
      res.send(result);
    });

    app.post('/pets', verifyToken, async (req, res) => {
      const pet = req.body;
      const result = await petsCollection.insertOne(pet);
      res.send(result);
    });

    app.patch('/pets/adopt/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const { adopted } = req.body;

      try {
        const result = await petsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { adopted: adopted } }
        );
        res.send(result);
      } catch (error) {
        console.error("Error updating adoption status:", error);
        res.status(500).send({ message: "Failed to update adoption status" });
      }
    });

    app.patch('/pets/:id', verifyToken, async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          name: item.name,
          category: item.category,
          age: item.age,
          location: item.location,
          image: item.image,
          shortDescription: item.shortDescription,
          longDescription: item.longDescription
        }
      };
      const result = await petsCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.delete('/pets/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await petsCollection.deleteOne(query);
      res.send(result);
    });

    // // Donation Campaigns-related APIs
    // app.get('/donationCampaigns', async (req, res) => {
    //   const result = await donationCampaignsCollection.find().sort({ createdAt: -1 }).toArray();
    //   res.send(result);
    // });

    // app.get('/donationCampaigns/recommended', async (req, res) => {
    //   const activeCampaigns = await donationCampaignsCollection
    //     .find({ isDonationStopped: false })
    //     .toArray();
    //   const randomCampaigns = activeCampaigns
    //     .sort(() => 0.5 - Math.random())
    //     .slice(0, 3);
    //   res.send(randomCampaigns);
    // });

    // app.get('/donationCampaigns/:id', async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) };
    //   const singlePetDonation = await donationCampaignsCollection.findOne(query);
    //   res.send(singlePetDonation);
    // });

    // app.get('/donationCampaigns/user/:email', verifyToken, async (req, res) => {
    //   const email = req.params.email;
    //   const query = { userEmail: email };
    //   const result = await donationCampaignsCollection.find(query).toArray();
    //   res.send(result);
    // });

    // app.post('/donationCampaigns', verifyToken, async (req, res) => {
    //   const donationCampaigns = req.body;
    //   const result = await donationCampaignsCollection.insertOne(donationCampaigns);
    //   res.send(result);
    // });

    // app.patch('/donationCampaigns/:id', verifyToken, async (req, res) => {
    //   const donation = req.body;
    //   const id = req.params.id;
    //   const filter = { _id: new ObjectId(id) };
    //   const updatedDoc = {
    //     $set: {
    //       name: donation.name,
    //       maxDonation: donation.maxDonation,
    //       lastDate: donation.lastDate,
    //       petImage: donation.petImage,
    //       shortDescription: donation.shortDescription,
    //       longDescription: donation.longDescription
    //     }
    //   };
    //   const result = await donationCampaignsCollection.updateOne(filter, updatedDoc);
    //   res.send(result);
    // });

    // app.patch('/donationCampaigns/stop/:id', verifyToken, async (req, res) => {
    //   const id = req.params.id;
    //   const { isDonationStopped } = req.body;
    //   const query = { _id: new ObjectId(id) };
    //   const updatedDoc = {
    //     $set: {
    //       isDonationStopped: isDonationStopped
    //     }
    //   };
    //   const result = await donationCampaignsCollection.updateOne(query, updatedDoc, { upsert: true });
    //   return res.send(result);
    // });

    // app.delete('/donationCampaigns/:id', verifyToken, async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) };
    //   const result = await donationCampaignsCollection.deleteOne(query);
    //   res.send(result);
    // });

    // // Adoptions-related APIs
    // app.get('/adoptions', async (req, res) => {
    //   const result = await adoptionsCollection.find().toArray();
    //   res.send(result);
    // });

    // app.get('/adoptions/user/:email', verifyToken, async (req, res) => {
    //   const email = req.params.email;
    //   const query = { email: email };
    //   const result = await adoptionsCollection.find(query).toArray();
    //   res.send(result);
    // });

    // app.post('/adoptions', async (req, res) => {
    //   const petAdoptions = req.body;
    //   const result = await adoptionsCollection.insertOne(petAdoptions);
    //   res.send(result);
    // });

    // app.patch('/adoptions/reject/:id', verifyToken, async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) };
    //   const updatedDoc = {
    //     $set: {
    //       status: 'reject'
    //     }
    //   };
    //   const result = await adoptionsCollection.updateOne(query, updatedDoc, { upsert: true });
    //   res.send(result);
    // });

    // app.patch('/adoptions/accept/:id', verifyToken, async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) };
    //   const updatedDoc = {
    //     $set: {
    //       status: 'accept'
    //     }
    //   };
    //   const alreadyAccepted = await adoptionsCollection.findOne(query);
    //   if (alreadyAccepted && alreadyAccepted.status === 'accept') {
    //     return res.send({ message: 'Adoption request already accepted' });
    //   }
    //   const result = await adoptionsCollection.updateOne(query, updatedDoc, { upsert: true });
    //   res.send(result);
    // });

    // // Payment-related APIs
    // app.post('/create-payment-intent', async (req, res) => {
    //   const { donationAmount } = req.body;
    //   const amount = parseInt(donationAmount * 100);
    //   const paymentIntent = await stripe.paymentIntents.create({
    //     amount: amount,
    //     currency: 'usd',
    //     payment_method_types: ['card']
    //   });
    //   res.send({
    //     clientSecret: paymentIntent.client_secret
    //   });
    // });

    // app.post('/payments', async (req, res) => {
    //   const payment = req.body;
    //   try {
    //     const paymentResult = await paymentCollection.insertOne(payment);
    //     let { donationAmount, petId } = payment;
    //     if (donationAmount && petId) {
    //       donationAmount = parseFloat(donationAmount);
    //       const campaignUpdateResult = await donationCampaignsCollection.updateOne(
    //         { _id: new ObjectId(petId) },
    //         { $inc: { donatedAmount: donationAmount } },
    //         { upsert: true }
    //       );
    //       console.log('Campaign Update Result:', campaignUpdateResult);
    //     }
    //     res.status(200).send({ message: 'Payment processed successfully', paymentResult });
    //   } catch (error) {
    //     console.error('Error processing payment:', error);
    //     res.status(500).send({ error: 'An error occurred while processing the payment' });
    //   }
    // });

    // app.get('/payments/:email', verifyToken, async (req, res) => {
    //   const email = req.params.email;
    //   const query = { email: email };
    //   const result = await paymentCollection.find(query).toArray();
    //   res.send(result);
    // });

    // app.get('/payments/user/:petId', verifyToken, async (req, res) => {
    //   const id = req.params.petId;
    //   const query = { petId: id };
    //   const result = await paymentCollection.find(query).toArray();
    //   res.send(result);
    // });

    // app.delete('/payments/:id', verifyToken, async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) };
    //   const result = await paymentCollection.deleteOne(query);
    //   if (result.deletedCount === 1) {
    //     res.send({ message: 'Donation removed successfully.' });
    //   } else {
    //     res.send({ message: 'No donation found to remove.' });
    //   }
    // });

    // app.patch('/payments/refund/:id', async (req, res) => {
    //   const id = req.params.id;
    //   const payment = req.body;
    //   const { donationAmount, petId } = payment.payment || {};
    //   if (donationAmount && petId) {
    //     const campaignUpdateResult = await donationCampaignsCollection.updateOne(
    //       { _id: new ObjectId(petId) },
    //       { $inc: { donatedAmount: -donationAmount } }
    //     );
    //     console.log('Campaign Update Result:', campaignUpdateResult);
    //   }
    //   const query = { _id: new ObjectId(id) };
    //   const updatedDoc = {
    //     $set: {
    //       refund: 'true',
    //     }
    //   };
    //   const result = await paymentCollection.updateOne(query, updatedDoc, { upsert: true });
    //   return res.send(result);
    // });

    // Connect to MongoDB
    // await client.connect();
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// Root route
app.get('/', (req, res) => {
  res.send('Yes, Pet Adoption is ON!!');
});

// Start the server
app.listen(port, () => {
  console.log(`Pet Adoption Server is running on port ${port}`);
});