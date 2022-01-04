const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const PORT = process.env.PORT || 3000;
const Busboy = require('busboy')
const busboy = require('connect-busboy');
const busboyBodyParser = require('busboy-body-parser');
const csv = require('csvtojson')
const fs = require('fs')

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(busboy());
app.use(busboyBodyParser());
let newdata = []



// AWS SDK
var AWS = require('aws-sdk');
const { S3 } = require('aws-sdk');
const { json } = require('body-parser');
AWS.config.loadFromPath('./config.json');
// AWS.config.getPromisesDependency();

AWS.config.update({ region: 'us-east-2' });
let bucket_name = 'dfinitybucket'
let finaljson = []



s3 = new AWS.S3({ apiVersion: '2006-03-01' });
app.get('/bucketname/:bname', (req, res, next) => {
  console.log(req.params.bname)
  // bucket_name=req.param
  res.send(req.params.bname)
  bucket_name = req.params.bname;
  next()
})

app.get('/', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.write('<form action="/api/upload" method="post" enctype="multipart/form-data">');
  res.write('<input type="file" name="filetoupload"><br>');
  res.write('<input type="submit">');
  res.write('</form>');
  return res.end();
})

app.post('/api/upload', function (req, res, next) {
  // This grabs the additional parameters so in this case passing     
  // in "element1" with a value.
  const element1 = req.body.element1;
  var busboy = new Busboy({ headers: req.headers });
  // The file upload has completed
  busboy.on('finish', function () {
    console.log('Upload finished');
    // Your files are stored in req.files. In this case,
    // you only have one and it's req.files.element2:
    // This returns:
    // {
    //    element2: {
    //      data: ...contents of the file...,
    //      name: 'Example.jpg',
    //      encoding: '7bit',
    //      mimetype: 'image/png',
    //      truncated: false,
    //      size: 959480
    //    }
    // }
    // Grabs your file object from the request.
    //  const file = req.files.element2;
    const file = req.files.filetoupload;
    //  console.log(innerfil)
    console.log(file);

    var uploadParams = { Bucket: bucket_name, Key: file.name, Body: file.data };

    // Configure the file stream and obtain the upload parameters



    // call S3 to retrieve upload file to specified bucket
    s3.upload(uploadParams, function (err, data) {
      if (err) {
        console.log("Error", err);
      } if (data) {
        console.log("Upload Success", data.Location);
        // res.send('upload success')
      }
    });
  });
  req.pipe(busboy);
});
app.post('/createbucket', (req, res) => {
  //    console.log(req.body.newBucket)
  //    res.send({success:"thanks mate"})
  var bucketParams = {
    Bucket: req.body.newBucket
  };
  s3.createBucket(bucketParams, function (err, data) {
    if (err) {
      console.log("Error", err);
      //   res.send("Error", err);
    } else {
      console.log("Success", data.Location);
      res.send({ "Success": data.Location });
    }
  });
})
app.post('/deletebucket', (req, res) => {
  var bucketParams = {
    Bucket: bucket_name
  };

  // Call S3 to delete the bucket
  s3.deleteBucket(bucketParams, function (err, data) {
    if (err) {
      console.log("Error", err);
    } else {
      console.log("Success", data);

    }
  });
})

app.get('/listbuckets', async (req, res, next) => {


  await s3.listBuckets(function (err, data) {
    if (err) {
      console.log("Error", err);
      res.send(err)
      next();
    } else {

      console.log("Success", data.Buckets);
      res.send(data.Buckets)
      next()

    }
  });

})

app.post('/lllc', async (req, res) => {

  const getDataUsingS3Select = async (params) => {
    return new Promise((resolve, reject) => {
      s3.selectObjectContent(params, (err, data) => {
        if (err) { reject(err); }

        if (!data) {
          reject('Empty data object');
        }

        // This will be an array of bytes of data, to be converted
        // to a buffer
        const records = []

        // This is a stream of events
        data.Payload.on('data', (event) => {
          // There are multiple events in the eventStream, but all we 
          // care about are Records events. If the event is a Records 
          // event, there is data inside it
          if (event.Records) {
            records.push(event.Records.Payload);
          }
        })
          .on('error', (err) => {
            reject(err);
          })
          .on('end', () => {
            // Convert the array of bytes into a buffer, and then
            // convert that to a string
            let planetString = Buffer.concat(records).toString('utf8');

            // remove any trailing commas
            planetString = planetString.replace(/\,$/, '');

            // Add into JSON 'array'
            planetString = `[${planetString}]`;

            try {
              const planetData = JSON.parse(planetString);
              resolve(planetData);
            } catch (e) {
              reject(new Error(`Unable to convert S3 data to JSON object. S3 Select Query: ${params.Expression}`));
            }
          });
      });
    })
  }
  const query = 'SELECT * FROM s3object';

  const params = {
    Bucket: 'dfinitybucket',
    Key: 'sample2.json',
    ExpressionType: 'SQL',
    Expression: query,
    InputSerialization: {
      JSON: {
        Type: 'DOCUMENT',
      }
    },
    OutputSerialization: {
      JSON: {
        RecordDelimiter: ','
      }
    }
  }

  const data = await getDataUsingS3Select(params);

  console.log(data);
  res.send(data)



})
app.post('/update', async (req, res) => {

  const getDataUsingS3Select = async (params) => {
    return new Promise((resolve, reject) => {
      s3.selectObjectContent(params, (err, data) => {
        if (err) { reject(err); }

        if (!data) {
          reject('Empty data object');
        }

        // This will be an array of bytes of data, to be converted
        // to a buffer
        const records = []

        // This is a stream of events
        data.Payload.on('data', (event) => {
          // There are multiple events in the eventStream, but all we 
          // care about are Records events. If the event is a Records 
          // event, there is data inside it
          if (event.Records) {
            records.push(event.Records.Payload);
          }
        })
          .on('error', (err) => {
            reject(err);
          })
          .on('end', () => {
            // Convert the array of bytes into a buffer, and then
            // convert that to a string
            let planetString = Buffer.concat(records).toString('utf8');

            // remove any trailing commas
            planetString = planetString.replace(/\,$/, '');

            // Add into JSON 'array'
            planetString = `[${planetString}]`;

            try {
              const planetData = JSON.parse(planetString);
              resolve(planetData);
            } catch (e) {
              reject(new Error(`Unable to convert S3 data to JSON object. S3 Select Query: ${params.Expression}`));
            }
          });
      });
    })
  }
  const query = 'SELECT * FROM s3object';

  const params = {
    Bucket: 'dfinitybucket',
    Key: 'sample2.json',
    ExpressionType: 'SQL',
    Expression: query,
    InputSerialization: {
      JSON: {
        Type: 'DOCUMENT',
      }
    },
    OutputSerialization: {
      JSON: {
        RecordDelimiter: ','
      }
    }
  }

  const data = await getDataUsingS3Select(params);

  console.log(data);


  function putObjectToS3(data, nameOfFile) {

    var params = {
      Bucket: "dfinitybucket",
      Key: "sample2.json",
      Body: data
    }
    s3.putObject(params, function (err, data) {
      if (err) console.log(err, err.stack);
      else console.log("Put to s3 should have worked: " + data);
    });
  }
  console.log(req.body)
  newdata = data;
  newdata.push(req.body)



  var jsonOutput = JSON.stringify(newdata);

  console.log(jsonOutput);

  putObjectToS3(jsonOutput, "myData")

})



app.get('/listobjects', (req, res) => {
  var bucketParams = {
    Bucket: bucket_name,
  };
  s3.listObjects(bucketParams, function (err, data) {
    if (err) {
      console.log("Error", err);
      res.send(err)

    } else {

      console.log("Success", data);
      res.send(data);
    }
  });
})
app.listen(PORT, () => {
  console.log('server running')
})