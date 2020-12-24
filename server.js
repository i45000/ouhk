const express = require('express'); 
const app = express();
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const session = require('cookie-session');
const fs = require('fs');
const formidable = require('formidable');


const assert = require('assert');
const http = require('http');
const url = require('url');

const mongourl = 'mongodb+srv://kahowongDB:35282539@cluster0.upead.mongodb.net/test?retryWrites=true&w=majority';
const dbName='test';

app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));
app.set('view engine','ejs');
app.get('/login', function(req, res) {
    var username = req.query.username;
    var password = req.query.password;
    console.log(username);
    if((username=="demo"&& password=="")||(username=="demo2"&& password=="")){
    req.session.username = username;
    req.session.loggedin = true;
    res.redirect('/display');
   } 
    
else {
   
    res.status(200).render('info',{message:"Username or password is invalid",backurl:"/"});
}

});
const findDocument = (db, criteria, callback) => {
    let cursor = db.collection('restaurants').find(criteria);
    console.log(`findDocument: ${JSON.stringify(criteria)}`);
    cursor.toArray((err,docs) => {
        assert.equal(err,null);
        console.log(`findDocument: ${docs.length}`);
        callback(docs);
    });
}
const updateDocument = (criteria, updateDoc, callback) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
        if(updateDoc.grades){

          db.collection('restaurants').updateOne(criteria,
            {
                $push : updateDoc
            },
            (err, results) => {
                client.close();
                assert.equal(err, null);
                callback(results);
            }
        );
        }else {
        db.collection('restaurants').updateOne(criteria,
            {
                $set : updateDoc
            },
            (err, results) => {
                client.close();
                assert.equal(err, null);
                callback(results);
            }
        );
       }
    });
}

const insertDocument = (doc, callback) => {
  const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
    db.collection('restaurants').insertOne(doc, (err, results) => {
    assert.equal(err,null);
    console.log("inserted one document " + JSON.stringify(doc));
    callback(results);
   });
  });
}

const deleteDocument = (DOCID, callback) => {
  const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
    db.collection('restaurants').deleteOne(DOCID, (err, results) => {
    assert.equal(err,null);
    console.log("Delete one document " + JSON.stringify(DOCID['_id']));
    callback(results);
   });
  });
}
const handle_Insert = (req,res, criteria) => {
 
      const doc = 
{
    "name" : req.query.name,
    "borough" : req.query.borough,
    "cuisine" : req.query.cuisine,
    "address" : {
        "street" : req.query.street,
        "zipcode" : req.query.zipcode,
        "building" : req.query.building,
        "coord" : [ 
            req.query.lon, 
            req.query.lat
        ]
    },
    "grades" : [ 
    ],
    "owner" : req.session.username
};
        insertDocument(doc, (results) => {
         if (results.insertedCount == 1) {
           res.status(200).render('info',{message:"Create Success",backurl:"/details?_id="+doc._id});
              } else {
           res.status(200).render('info',{message:"Create Fail",backurl:"/"});
           }
       });

  }
        
const handle_Find = (req,res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        findDocument(db, criteria, (docs) => {
            client.close();
            console.log("Closed DB connection");
            res.status(200).render('read',{nRestaurants:docs.length,restaurants:docs,username:req.session.username});
        });
    });
}
const handle_Edit = (res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        let DOCID = {};
        DOCID['_id'] = ObjectID(criteria._id)
        let cursor = db.collection('restaurants').find(DOCID);
        cursor.toArray((err,docs) => {
            client.close();
            assert.equal(err,null);
             res.status(200).render('change',{restaurants:docs[0]});
            

        });
    });
}

const handle_Delete = (res, criteria) => {
        var DOCID = {};
        DOCID['_id'] = ObjectID(criteria._id);
        deleteDocument(DOCID, (results) => {
         if (results.deletedCount == 1) {
           res.status(200).render('info',{message:"Delete Success",backurl:"/"});
              } else {
           res.status(200).render('info',{message:"Delete Fail",backurl:"/details?_id="+doc._id});
           }
       });
}

const handle_Details = (req,res, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

        let DOCID = {};
        DOCID['_id'] = ObjectID(criteria._id)
        findDocument(db, DOCID, (docs) => { 
            client.close();
            console.log("Closed DB connection");
            var isRated = false;
            var isOwner = false;
            if(docs[0].grades){
            for (var g of docs[0].grades){
            if(g.user==req.session.username)
            isRated = true;
            }         
          }
            if(req.session.username==docs[0].owner)
            isOwner= true;        
            res.status(200).render('details',{restaurants:docs[0],isRated:isRated,isOwner:isOwner});
          
            
        });
    });
}


const handle_Update = (req, res, criteria) => {

         var updateDoc = 
     {
    "name" : req.query.name,
    "borough" : req.query.borough,
    "cuisine" : req.query.cuisine,
    "address" : {
        "street" : req.query.street,
        "zipcode" : req.query.zipcode,
        "building" : req.query.building,
        "coord" : [ 
            req.query.lon, 
            req.query.lat
        ]
    }
}         
           var DOCID = {};
           DOCID['_id'] = ObjectID(criteria._id);
           console.log(criteria._id);
           updateDocument(DOCID, updateDoc, (results) => {
           console.log("updated one document " + JSON.stringify(updateDoc));
           if (results.modifiedCount == 1) {
           res.status(200).render('info',{message:"Update Success",backurl:"/details?_id="+criteria._id});
              } else {
           res.status(200).render('info',{message:"Update Fail",backurl:"/details?_id="+criteria._id});
           }
       });

      
}

const handle_UpdateRate = (req, res, criteria) => {

         var updateDoc = 
     {

       "grades" : {
        "user" : req.session.username,
        "score" : req.query.score
    }
};        
            var DOCID = {};
           DOCID['_id'] = ObjectID(criteria._id);
           console.log(criteria._id);
           updateDocument(DOCID, updateDoc, (results) => {
           console.log(results.modifiedCount);
           console.log("updated one document " + JSON.stringify(updateDoc));
           if (results.modifiedCount == 1) {
           res.status(200).render('info',{message:"Update Success",backurl:"/detail?_id="+criteria._id});
              } else {
           res.status(200).render('info',{message:"Update Fail",backurl:"/details?_id=r._id"});
           }
       });

      
}
app.get('/',(req,res)=>{
         if(req.session.loggedin){
           res.redirect('/display');
        }
        else res.status(200).render('login');
});
app.get('/logout',(req,res)=>{
         req.session.username=null;
         req.session.loggedin=false;
         res.status(200).render('login');
});
app.get('/display',(req,res)=>{
         handle_Find(req,res,req.query);
});
app.get('/details',(req,res)=>{
         handle_Details(req,res,req.query);
});
app.get('/insert',(req,res)=>{
         handle_Insert(req,res,req.query);
});
app.get('/edit',(req,res)=>{
         handle_Edit(res,req.query);
});
app.get('/update',(req,res)=>{
         handle_Update(req,res,req.query);
});
app.get('/delete',(req,res)=>{
         handle_Delete(res,req.query);
});
app.get('/new',(req,res)=>{
           res.status(200).render('new');
});
app.get('/rate',(req,res)=>{
           res.status(200).render('rate',{_id:req.query._id});
});
app.get('/handleRate',(req,res)=>{
             handle_UpdateRate(req,res,req.query);
});
app.listen(app.listen(process.env.PORT || 8080));
