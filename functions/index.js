/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const functions = require('firebase-functions');
const firebase = require('firebase');
// CORS Express middleware to enable CORS Requests.
const cors = require('cors')({origin: true});
const paypal = require('paypal-rest-sdk');
// firebase-admin SDK init
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
// Configure your environment
paypal.configure({
  mode: 'sandbox', // sandbox or live
  client_id: functions.config().paypal.client_id, // run: firebase functions:config:set paypal.client_id="yourPaypalClientID" 
  client_secret: functions.config().paypal.client_secret // run: firebase functions:config:set paypal.client_secret="yourPaypalClientSecret"
});

module.exports = function(app) {
  // Tasks Routes
  app.route('/api/products').all(tasksPolicy.isAllowed)
    .get(tasks.list)
    .post(tasks.create);

  app.route('/api/tasks/:taskId').all(tasksPolicy.isAllowed)
    .get(tasks.read)
    .put(tasks.update)
    .delete(tasks.delete)
    .post(tasks.newCo);

  // Finish by binding the Task middleware
  app.param('taskId', tasks.taskByID);
};

/**
 * Expected in the body the amount
 * Set up the payment information object
 * Initialize the payment and redirect the user to the PayPal payment page
 //`${req.protocol}:

 */
exports.pay = functions.https.onRequest((req, res) => {
    // 1.Set up a payment information object, Nuild PayPal payment request
    const payReq = JSON.stringify({
        intent: 'sale',
        payer: {
          payment_method: 'paypal'
        },
        redirect_urls: {
          return_url: `${req.get('host')}/process`,
          cancel_url: `${req.get('host')}/cancel`
        },
        transactions: [{
          amount: {
            total: req.body.price,
            currency: 'USD'
          },
          // This is the payment transaction description. Maximum length: 127
          description: req.body.uid, // req.body.id
          // reference_id string .Optional. The merchant-provided ID for the purchase unit. Maximum length: 256.
          // reference_id: req.body.uid,
          custom: req.body.uid,
          // soft_descriptor: req.body.uid
          // "invoice_number": req.body.uid,A
        }]
    });
    // 2.Initialize the payment and redirect the user.
    paypal.payment.create(payReq, (error, payment) => {
        const links = {};
        if (error) {
            console.error(error);
            res.status('500').end();
        } else {
            // Capture HATEOAS links
            payment.links.forEach((linkObj) => {
              links[linkObj.rel] = {
                href: linkObj.href,
                method: linkObj.method
              };
            });
            // If redirect url present, redirect user
            if (links.hasOwnProperty('approval_url')) {
                // REDIRECT USER TO links['approval_url'].href
                console.info(links.approval_url.href);
                // res.json({"approval_url":links.approval_url.href});
                res.redirect(302, links.approval_url.href);
            } else {
                console.error('no redirect URI present');
                res.status('500').end();
            }
        }
    });
});

// 3.Complete the payment. Use the payer and payment IDs provided in the query string following the redirect.
exports.process = functions.https.onRequest((req, res) => {
  const paymentId = req.query.paymentId;
  const payerId = {
    payer_id: req.query.PayerID
  };
  paypal.payment.execute(paymentId, payerId, (error, payment) => {
    if (error) {
      console.error(error);
      res.redirect(`${req.protocol}://${req.get('host')}/error`); // replace with your url page error
    } else {
      if (payment.state === 'approved') {
        console.info('payment completed successfully, description: ', payment.transactions[0].description);
        // console.info('req.custom: : ', payment.transactions[0].custom);
        // set paid status to True in RealTime Database
        const date = Date.now();
        const uid = payment.transactions[0].description;
        const ref = admin.database().ref('users/' + uid + '/');
        ref.push({
          'paid': true,
          // 'description': description,
          'date': date
        }).then(r => console.info('promise: ', r));
        res.redirect(`${req.protocol}://${req.get('host')}/success`); // replace with your url, page success
      } else {
        console.warn('payment.state: not approved ?');
        // replace debug url
        res.redirect(`https://console.firebase.google.com/project/${process.env.GCLOUD_PROJECT}/functions/logs?search=&severity=DEBUG`);
      }
    }
  });
});

// [START addMessage]
// Take the text parameter passed to this HTTP endpoint and insert it into the
// Realtime Database under the path /messages/:pushId/original
// [START addMessageTrigger]
// exports.addMessage = functions.https.onRequest((req, res) => {
// // [END addMessageTrigger]
//     // Grab the text parameter.
//     const original = req.query.text;
//     // [START adminSdkPush]
//     // Push the new message into the Realtime Database using the Firebase Admin SDK.
//     admin.database().ref('/messages').push({original: original}).then(snapshot => {
//         // Redirect with 303 SEE OTHER to the URL of the pushed object in the Firebase console.
//         res.redirect(303, snapshot.ref);
//     });
//     // [END adminSdkPush]
// });
// [END addMessage]

// [START makeUppercase]
// Listens for new messages added to /messages/:pushId/original and creates an
// uppercase version of the message to /messages/:pushId/uppercase
// [START makeUppercaseTrigger]
exports.makeUppercase = functions.database.ref('/Products/Bras/')
    .onWrite(event => {
// [END makeUppercaseTrigger]
        // [START makeUppercaseBody]
        // Grab the current value of what was written to the Realtime Database.
        const original = event.data.val();
        console.log('Uppercasing', event.params, original);
        const uppercase = original.toUpperCase();
        // You must return a Promise when performing asynchronous tasks inside a Functions such as
        // writing to the Firebase Realtime Database.
        // Setting an "uppercase" sibling in the Realtime Database returns a Promise.
        // return event.data.ref.parent.child('uppercase').set(uppercase);
        // [END makeUppercaseBody]
    });
// [END makeUppercase]
// [END all]
// ////
// ///**
// // * Copyright 2016 Google Inc. All Rights Reserved.
// // *
// // * Licensed under the Apache License, Version 2.0 (the "License");
// // * you may not use this file except in compliance with the License.
// // * You may obtain a copy of the License at
// // *
// // *      http://www.apache.org/licenses/LICENSE-2.0
// // *
// // * Unless required by applicable law or agreed to in writing, software
// // * distributed under the License is distributed on an "AS IS" BASIS,
// // * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// // * See the License for the specific language governing permissions and
// // * limitations under the License.
// // */
// 'use strict';
// //
// const functions = require('firebase-functions'),
//      admin = require('firebase-admin'),
//      logging = require('@google-cloud/logging')();
// const express = require('express');
// const product = firebase.database().ref().child('Products');
// const app = express();
// //
//
//
// exports.makeUppercase = functions.database.ref('/messages/{pushId}/original')
//     .onWrite(event => {
//         // Grab the current value of what was written to the Realtime Database.
//         const original = event.data.val();
//         console.log('Uppercasing', event.params.pushId, original);
//         const uppercase = original.toUpperCase();
//         // You must return a Promise when performing asynchronous tasks inside a Functions such as
//         // writing to the Firebase Realtime Database.
//         // Setting an "uppercase" sibling in the Realtime Database returns a Promise.
//         return event.data.ref.parent.child('uppercase').set(uppercase);
//     });
//
// // app.get("/", (req,res) => re
// // app.route("/product/:id")
// //    .get(product.loadProducts);
//
// //var paypal = require('paypal-rest-sdk');
// //require('../configure');
// //admin.initializeApp(functions.config().firebase);
// //
// //paypal.configure({
// //    'mode': 'sandbox', //sandbox or live
// //    'client_id': 'AVgU8_8H5pUASmivdzt9vVoiZLY5bByaYeBoepWJWxRzFw1tuhgzQoxCyYxJ79Snl6ik26zrjYXPUAC3',
// //    'client_secret': 'EFg__9gRO6hS_Axj480ejQ_zgRWyzRgXOkhMghnpHNSv3W9RRKiIp9IvPOUY9mzaI2t-dAPkIqSsS9nS',
// //    'headers' : {
// //		'custom': 'header'
// //    }
// //});
// //
// //var create_payment_json = {
// //    "intent": "authorize",
// //    "payer": {
// //        "payment_method": "paypal"
// //    },
// //    "redirect_urls": {
// //        "return_url": "http://return.url",
// //        "cancel_url": "http://cancel.url"
// //    },
// //    "transactions": [{
// //        "item_list": {
// //            "items": [{
// //                "name": "item",
// //                "sku": "item",
// //                "price": "1.00",
// //                "currency": "USD",
// //                "quantity": 1
// //            }]
// //        },
// //        "amount": {
// //            "currency": "USD",
// //            "total": "1.00"
// //        },
// //        "description": "This is the payment description."
// //    }]
// //};
// //
// //paypal.payment.create(create_payment_json, function (error, payment) {
// //    if (error) {
// //        console.log(error.response);
// //        throw error;
// //    } else {
// //        for (var index = 0; index < payment.links.length; index++) {
// //        //Redirect user to this endpoint for redirect url
// //            if (payment.links[index].rel === 'approval_url') {
// //                console.log(payment.links[index].href);
// //            }
// //        }
// //        console.log(payment);
// //    }
// //});
// //
// //var execute_payment_json = {
// //    "payer_id": "Appended to redirect url",
// //    "transactions": [{
// //        "amount": {
// //            "currency": "USD",
// //            "total": "1.00"
// //        }
// //    }]
// //};
// //
// //var paymentId = 'PAYMENT id created in previous step';
// //
// //paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
// //    if (error) {
// //        console.log(error.response);
// //        throw error;
// //    } else {
// //        console.log("Get Payment Response");
// //        console.log(JSON.stringify(payment));
// //    }
// //});
// //
// ////
// ////const stripe = require('stripe')(functions.config().stripe.token),
// ////      currency = functions.config().stripe.currency || 'USD';
// ////
// ////// [START chargecustomer]
// ////// Charge the Stripe customer whenever an amount is written to the Realtime database
// ////exports.createStripeCharge = functions.database.ref('/stripe_customers/{userId}/charges/{id}').onWrite(event => {
// ////  const val = event.data.val();
// ////  // This onWrite will trigger whenever anything is written to the path, so
// ////  // noop if the charge was deleted, errored out, or the Stripe API returned a result (id exists)
// ////  if (val === null || val.id || val.error) return null;
// ////  // Look up the Stripe customer id written in createStripeCustomer
// ////  return admin.database().ref(`/stripe_customers/${event.params.userId}/customer_id`).once('value').then(snapshot => {
// ////    return snapshot.val();
// ////  }).then(customer => {
// ////    // Create a charge using the pushId as the idempotency key, protecting against double charges
// ////    const amount = val.amount;
// ////    const idempotency_key = event.params.id;
// ////    let charge = {amount, currency, customer};
// ////    if (val.source !== null) charge.source = val.source;
// ////    return stripe.charges.create(charge, {idempotency_key});
// ////  }).then(response => {
// ////      // If the result is successful, write it back to the database
// ////      return event.data.adminRef.set(response);
// ////    }, error => {
// ////      // We want to capture errors and render them in a user-friendly way, while
// ////      // still logging an exception with Stackdriver
// ////      return event.data.adminRef.child('error').set(userFacingMessage(error)).then(() => {
// ////        return reportError(error, {user: event.params.userId});
// ////      });
// ////    }
// ////  );
// ////});
// ////// [END chargecustomer]]
// ////
// ////// When a user is created, register them with Stripe
// ////exports.createStripeCustomer = functions.auth.user().onCreate(event => {
// ////  const data = event.data;
// ////  return stripe.customers.create({
// ////    email: data.email
// ////  }).then(customer => {
// ////    return admin.database().ref(`/stripe_customers/${data.uid}/customer_id`).set(customer.id);
// ////  });
// ////});
// ////
// Add a payment source (card) for a user by writing a stripe payment source token to Realtime database
exports.cart = functions.database.ref('/{userId}/sources/{pushId}/token').onWrite(event => {
 const source = event.data.val();
 if (source === null) return null;
 return admin.database().ref(`/stripe_customers/${event.params.userId}/customer_id`).once('value').then(snapshot => {
   return snapshot.val();
 }).then(customer => {
   return stripe.customers.createSource(customer, {source});
 }).then(response => {
     return event.data.adminRef.parent.set(response);
   }, error => {
     return event.data.adminRef.parent.child('error').set(userFacingMessage(error)).then(() => {
       return reportError(error, {user: event.params.userId});
     });
 });
});
// ////
// ////// When a user deletes their account, clean up after them
// exports.cart = functions.auth.user()(event => {
//  return admin.database().ref(`/stripe_customers/${event.data.uid}`).once('value').then(snapshot => {
//    return snapshot.val();
//  }).then(customer => {
//    return stripe.customers.del(customer);
//  }).then(() => {
//    return admin.database().ref(`/stripe_customers/${event.data.uid}`).remove();
//  });
// });
// ////
// ////// To keep on top of errors, we should raise a verbose error report with Stackdriver rather
// ////// than simply relying on console.error. This will calculate users affected + send you email
// ////// alerts, if you've opted into receiving them.
// ////// [START reporterror]
// ////function reportError(err, context = {}) {
// ////  // This is the name of the StackDriver log stream that will receive the log
// ////  // entry. This name can be any valid log stream name, but must contain "err"
// ////  // in order for the error to be picked up by StackDriver Error Reporting.
// ////  const logName = 'errors';
// ////  const log = logging.log(logName);
// ////
// ////  // https://cloud.google.com/logging/docs/api/ref_v2beta1/rest/v2beta1/MonitoredResource
// ////  const metadata = {
// ////    resource: {
// ////      type: 'cloud_function',
// ////      labels: { function_name: process.env.FUNCTION_NAME }
// ////    }
// ////  };
// ////
// ////  // https://cloud.google.com/error-reporting/reference/rest/v1beta1/ErrorEvent
// ////  const errorEvent = {
// ////    message: err.stack,
// ////    serviceContext: {
// ////      service: process.env.FUNCTION_NAME,
// ////      resourceType: 'cloud_function'
// ////    },
// ////    context: context
// ////  };
// ////
// ////  // Write the error log entry
// ////  return new Promise((resolve, reject) => {
// ////    log.write(log.entry(metadata, errorEvent), error => {
// ////      if (error) { reject(error); }
// ////      resolve();
// ////    });
// ////  });
// ////}
// ////// [END reporterror]
// ////
// ////// Sanitize the error message for the user
// ////function userFacingMessage(error) {
// ////  return error.type ? error.message : 'An error occurred, developers have been alerted';
// ////}