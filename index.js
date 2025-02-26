require('dotenv').config();
const express = require('express')
const cors = require("cors");
const jwt = require('jsonwebtoken');
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);



const app = express()
const port = process.env.PORT || 5000;


// middleware
app.use(cors({origin: [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
],
credentials: true,
}));
app.use(express.json());
app.use(cookieParser());



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
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      });
      res.send({ token })
    })

    // verify Token through MiddleWare
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'Unauthorized Access' })
          }
      const token = req.headers.authorization.split(' ')[1];
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
          if (err) {
            return res.status(401).send({ message: 'Unauthorized Access' })
            }
            req.decoded = decoded;
            next();
          })
        }

    // use verify admin after verifyToken 
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await userCollection.findOne(query)
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next();
    }

    // user relate api 
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user alreay exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result)
    })

    // get user
    app.get('/users', verifyToken, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    })


    // database updated 
    app.patch('/users/admin/:id', verifyToken, async (req, res) => {
      const id = req.params.id;

      try {
        const result = await userCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { role: "admin" } }
        );

        res.send(result);
      } catch (error) {
        console.error("Error updating adoption status:", error);
        res.status(500).send({ message: "Failed to update adoption status" });
      }
    });


    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      // if(email !== req.decoded.email){
      //   return res.status(403).send({message: 'orbidden access'})
      // }
      const query = { email: email }
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin })
    })


  // Get pets data
  app.get('/pets',  async (req, res) => {
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
        
   // post data
   app.post('/pets', verifyToken, async (req, res) => {
    const pet = req.body;
    const result = await petsCollection.insertOne(pet);
    res.send(result);
  })

      //get a single pets data by id
      app.get('/pets/:id',  async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        // console.log(req.cookies)
        const singlepet = await petsCollection.findOne(query);
        res.send(singlepet)
      })
  
        //featch data by category name 
        app.get('/pets/category/:name', async (req, res) => {
          const category_name = req.params.name;
          const query = { category: category_name };
          const result = await petsCollection.find(query).toArray();
          res.send(result);
        })
  
     // get all pets posted by specfic user
      app.get('/pets/user/:email', verifyToken, async (req, res) => {
        const email = req.params.email;
        const query = { 'userEmail': email };
        const result = await petsCollection.find(query).toArray();
        res.send(result);
      })
  
       // database updated 
        app.patch('/pets/adopt/:id',verifyToken, async (req, res) => {
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
  
      // delete
      app.delete('/pets/:id',verifyToken, async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        const result = await petsCollection.deleteOne(query);
        res.send(result);
      })
  
      // data updated
      app.patch('/pets/:id',verifyToken, async (req, res) => {
        const item = req.body;
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) }
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
        }
        const result = await petsCollection.updateOne(filter, updatedDoc)
        res.send(result);
      })
  
    
      //adoptions request 
      app.post('/adoptions', async (req, res) => {
        const petAdoptions = req.body;
        const result = await adoptionsCollection.insertOne(petAdoptions);
        res.send(result)
      })
  
      app.get('/adoptions', async (req, res) => {
        const result = await adoptionsCollection.find().toArray();
        res.send(result);
      })
  
      // . get all pets posted by specfic user
      app.get('/adoptions/user/:email',verifyToken, async (req, res) => {
        const email = req.params.email;
        const query = { 'email': email };
        const result = await adoptionsCollection.find(query).toArray();
        res.send(result);
      })
  
      //  adoption request reject
      app.patch('/adoptions/reject/:id',verifyToken, async(req,res)=>{
        const id = req.params.id;
        const queary = {_id: new ObjectId(id)};
        const updatedDoc = {
          $set: {
            status: 'reject'
          }
        }
  
        const result = await adoptionsCollection.updateOne(queary,updatedDoc,{ upsert: true })
        res.send(result);
  
         
      })
  
      //  adoption request accept
      app.patch('/adoptions/accept/:id',verifyToken, async(req,res)=>{
        const id = req.params.id;
        const queary = {_id: new ObjectId(id)};
        const updatedDoc = {
          $set: {
            status: 'accept'
          }
        }
  
        const already_accept = await adoptionsCollection.findOne(queary);
        console.log(already_accept)
        if(already_accept && already_accept.status === 'accept')
        {
          return res.send({message: 'Adoption request already accepted'})
        }
  
        const result = await adoptionsCollection.updateOne(queary,updatedDoc,{ upsert: true })
        res.send(result);
  
         
      })
  
      // donation data 
      app.post('/donationCampaigns', verifyToken, async (req, res) => {
        const donationCampaigns = req.body;
        const result = await donationCampaignsCollection.insertOne(donationCampaigns);
        res.send(result);
      })
      // all donation data get
      app.get('/donationCampaigns',  async (req, res) => {
        const result = await donationCampaignsCollection.find().sort({ createdAt: -1 }).toArray();
        res.send(result);
      })
  
      // / random selected active card
      app.get('/donationCampaigns/recommended', async (req, res) => {
       const activeCampaigns = await donationCampaignsCollection
            .find({ isDonationStopped: false })
            .toArray(); 
          const randomCampaigns = activeCampaigns
            .sort(() => 0.5 - Math.random()) 
            .slice(0, 3); 
          res.send(randomCampaigns); 
      });
      
      
      //get a single pets data by id
      app.get('/donationCampaigns/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        const singlepetdonation = await donationCampaignsCollection.findOne(query);
        res.send(singlepetdonation)
      })
  
      // . get all pets posted by specfic user
      app.get('/donationCampaigns/user/:email', verifyToken, async (req, res) => {
        const email = req.params.email;
        const query = { 'userEmail': email };
        const result = await donationCampaignsCollection.find(query).toArray();
        res.send(result);
      })
  
      app.patch('/donationCampaigns/:id', verifyToken, async (req, res) => {
        const donation = req.body;
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) }
        const updatedDoc = {
          $set: {
            name: donation.name,
            maxDonation: donation.maxDonation,
            lastDate: donation.lastDate,
            petImage: donation.petImage,
            shortDescription: donation.shortDescription,
            longDescription: donation.longDescription
          }
        }
        const result = await donationCampaignsCollection.updateOne(filter, updatedDoc)
        res.send(result);
      })
  
      //    //  patch for donation stop
      app.patch('/donationCampaigns/stop/:id', verifyToken,  async (req, res) => {
        const id = req.params.id;
        const { isDonationStopped } = req.body;  // Get the new status from the request body
       console.log(id, isDonationStopped)
        const queary = {_id: new ObjectId(id)};
        const updatedDoc = {
          $set: {
            isDonationStopped: isDonationStopped
          }
        };
        
        const result = await donationCampaignsCollection.updateOne(queary,updatedDoc,{ upsert: true });
        return res.send(result);
      });
  
       // delete
       app.delete('/donationCampaigns/:id', verifyToken, async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) }
        const result = await donationCampaignsCollection.deleteOne(query);
        res.send(result);
      })
  
  
      // payment 
      // app.post('/create-payment-intent', async (req, res) => {
      //   const { donationAmount } = req.body;
      //   const amount = parseInt(donationAmount * 100);
      //   console.log(amount, 'amount inside the intents')
      //   const paymentIntent = await stripe.paymentIntents.create({
      //     amount: amount,
      //     currency: 'usd',
      //     payment_method_types: ['card']
      //   });
      //   res.send({
      //     clientSecret: paymentIntent.client_secret
      //   })
      // })
  
      app.post('/payments', async (req, res) => {
        const payment = req.body;
  
        try {
         
          const paymentResult = await paymentCollection.insertOne(payment);
  
        
          let { donationAmount, petId } = payment;
  
          console.log('Donation Amount:', donationAmount, 'Pet ID:', petId);
  
          
          if (donationAmount && petId) {
            
            donationAmount = parseFloat(donationAmount);
  
           
            const campaignUpdateResult = await donationCampaignsCollection.updateOne(
              { _id: new ObjectId(petId) },
              { $inc: { donatedAmount: donationAmount } }, 
              { upsert: true } 
            );
  
            console.log('Campaign Update Result:', campaignUpdateResult);
          }
  
     
          
          // Step 4: Send response
          res.status(200).send({ message: 'Payment processed successfully', paymentResult });
        } catch (error) {
          console.error('Error processing payment:', error);
          res.status(500).send({ error: 'An error occurred while processing the payment' });
        }
      });
  
     // . get all pets posted by specfic user
      app.get('/payments/:email', verifyToken, async (req, res) => {
        const email = req.params.email;
        const query = { 'email': email };
        const result = await paymentCollection.find(query).toArray();
        res.send(result);
      })
  
      app.get('/payments/user/:petId', verifyToken, async (req, res) => {
        const id = req.params.petId;
        const query = { 'petId': id };
        const result = await paymentCollection.find(query).toArray();
        res.send(result);
      })
  
   // DELETE request 
    app.delete('/payments/:id', verifyToken, async (req, res) => {
        const id = req.params.id;
        const query = { '_id': new ObjectId(id) };
        const result = await paymentCollection.deleteOne(query);
        if (result.deletedCount === 1) {
          res.send({ message: 'Donation removed successfully.' });
        } else {
          res.send({ message: 'No donation found to remove.' });
        }
      });
  
      //  payment refund 
  app.patch('/payments/refund/:id',async(req,res)=>{
    const id = req.params.id;
    const payment = req.body;
    const { donationAmount, petId } = payment.payment || {};
   
   
  
    if (donationAmount && petId) {
      // Convert donationAmount to a number if it's a string
      // donationAmount = parseFloat(donationAmount);
  
      // Update the donation campaign
      const campaignUpdateResult = await donationCampaignsCollection.updateOne(
        { _id: new ObjectId(petId) }, // Match campaign by its ID
        { $inc: { donatedAmount: -donationAmount } }, // decrice totalDonations
         
      );
  
      console.log('Campaign Update Result:', campaignUpdateResult);
    }
   
   
    const queary = {_id: new ObjectId(id)};
    const updatedDoc = {
      $set:{
        refund: 'true',
      }
    }
  
    const result = await paymentCollection.updateOne(queary,updatedDoc,{upsert: true});
    return res.send(result);
  })
  
      // admin all pets data 
      app.get('/admin/all-pets', verifyToken, verifyAdmin, async (req, res) => {
        const result = await petsCollection.find().toArray();
        res.send(result);
      })
      // admin all donation campigan data 
      app.get('/admin/all-donationCampaigns', verifyToken, verifyAdmin, async (req, res) => {
        const result = await donationCampaignsCollection.find().toArray();
        res.send(result);
      })
  
      // database updated 
      app.patch('/admin/paused/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const { isDonationStopped} = req.body;
      
            try {
              const result = await donationCampaignsCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { isDonationStopped: isDonationStopped } }
              );
      
              res.send(result);
            } catch (error) {
              console.error("Error updating adoption status:", error);
              res.status(500).send({ message: "Failed to update adoption status" });
            }
      });

    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Yes, Pet Adoption is ON!!')
})

app.listen(port, () => {
  console.log(`Pet Adoption Server is running on port ${port}`)
})