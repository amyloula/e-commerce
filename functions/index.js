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
// ////// To keep on top of errors, we should raise a verbose error report with Stackdriver rather
// ////// than simply relying on console.error. This will calculate users affected + send you email
// ////// alerts, if you've opted into receiving them.
// ////// [START reporterror]
function reportError(err, context = {}) {
    // This is the name of the StackDriver log stream that will receive the log
    // entry. This name can be any valid log stream name, but must contain "err"
    // in order for the error to be picked up by StackDriver Error Reporting.
    const logName = 'errors';
    const log = logging.log(logName);

    // https://cloud.google.com/logging/docs/api/ref_v2beta1/rest/v2beta1/MonitoredResource
    const metadata = {
        resource: {
            type: 'cloud_function',
            labels: {function_name: process.env.FUNCTION_NAME}
        }
    };

    // https://cloud.google.com/error-reporting/reference/rest/v1beta1/ErrorEvent
    const errorEvent = {
        message: err.stack,
        serviceContext: {
            service: process.env.FUNCTION_NAME,
            resourceType: 'cloud_function'
        },
        context: context
    };

    // Write the error log entry
    return new Promise((resolve, reject) => {
        log.write(log.entry(metadata, errorEvent), error => {
            if (error) {
                reject(error);
            }
            resolve();
        });
    });
}

// [END reporterror]

// Sanitize the error message for the user
function userFacingMessage(error) {
    return error.type ? error.message : 'An error occurred, developers have been alerted';
}