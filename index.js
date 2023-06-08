// Require the framework and instantiate it
// CommonJs

// Constants (cant use export with vanilla js/node)
const water = {
  red: 0,
  green: 0,
  blue: 255,
}

const sun = {
  red: 255,
  green: 63,
  blue: 0,
}

const fertilizer = {
  red: 255,
  green: 0,
  blue: 0,
}

const defaultState = {
  red: 0,
  green: 63,
  blue: 0,
}

const DEFAULT_STATE_NUMBER = -1;

const DEFAULT_DEVICE_NAME = "PlantSense - Planty";

const fetch = require("node-fetch");

// Update this for demo
// const esp_url = "http://192.168.141.35";
const HTTP_TIMEOUT = 4000;
const ADDRESS_PREFIX = "http://";

// Storage for notifications
const notifications = [{name: "Planty", notifications: [0,1]}];

let currentState;

// TODO: change this to be arr of [{name: string(esp name), address: string}]
// Change default value here
let espAddress = "http://192.168.141.35";

const fastify = require('fastify')({
  logger: true
})

// Declare a route
fastify.get('/', function (request, reply) {
  console.log("Got request, " + request.ip);
  reply.send("Response (Hello World)")
})

fastify.get('/heartbeat', async (request, reply) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HTTP_TIMEOUT);

  try {
    const response = await fetch(espAddress + "/heartbeat", {
      signal: controller.signal
    }).then(() => {
      // If request was successful, pass success status code
      console.log("Esp heartbeat ack");
      reply.status(200);
    });
    console.log(response);
  } catch (error) {
    // 503 service unavailable
    console.log("Error:",error);
    reply.status(503);
  } finally {
    clearTimeout(timeoutId);
  }
})

// Endpoint to receive notification from esp32 microcontroller (contains device name)
// needs payload with scheme:
// {name: "device name here"}
fastify.post('/sendNotification', async (request, reply) => {
  try {
    // Process the request and perform any necessary operations
    const data = request.body; // Access the request body

    const deviceName = data["name"];
    console.log("Received request: ", deviceName);

    // Update notifications array
    const state = updateNotifications(deviceName);

    // Set state of microcontroller
    setState(state);

    // Send the response
    reply.status(200);
  } catch (error) {
    console.error(error);
    reply.status(500).send({ success: false, message: 'An error occurred' });
  }
});

// Endpoint that esp calls on startup to register itself (if not already registered on server)
// Needs refactoring on esp32 microcontroller side, for now almost duplicate endpoint (see "/sendNotification")
fastify.post('/registerDevice', async (request, reply) => {
  try {
    espAddress = ADDRESS_PREFIX + request.ip;
    console.log("Registered with address: ", espAddress);
    // Process the request and perform any necessary operations
    const data = request.body; // Access the request body
    const deviceName = data["name"];

    // Register device in notifications array (if it does not already exist)
    const notificationsOfDevice = notifications.find(o => o.name === deviceName);
    if(!notificationsOfDevice) {
      notifications.push({name: deviceName, notifications: []});
    }

    setState(DEFAULT_STATE_NUMBER);
    // Send the response
    reply.status(200);
  } catch (error) {
    console.error(error);
    reply.status(500).send({ success: false, message: 'An error occurred' });
  }
})

// Returns the name of all registered devices on the server
// e.g: (["Planty", "Device2"])
fastify.get('/devices', async (request, reply) => {
  const devices = [];
  for (const element of notifications) {
    devices.push(element.name);
  }

  reply.send(devices);
});

fastify.get('/notifications', async (request, reply) => {
  // gets the '?name=' parameter
  const deviceName = request.query.name;

  // Find notifications for device
  const notificationsOfDevice = notifications.find(o => o.name === deviceName);
  if(!notificationsOfDevice) {
    console.log("Invalid device")
    reply.status(404);
  } else {
    reply.status(200).send(notificationsOfDevice.notifications);
  }
});

/**
 * Returns all notifications for all devices stored on the server.
 * Scheme: [{name: string, notifications: number}]
 */
fastify.get('/allNotifications', async (req, reply) => {
  if(!notifications) {
    reply.status(500);
    return;
  }
  reply.status(200).send(notifications);
});

fastify.post('/setState', async (request, reply) => {
  try {
    // gets the '?state=' parameter
    const stateBody = request.body["state"];

    // Cast state
    let state;
    try {
      state = parseInt(stateBody);
    } catch {
      console.error("/setState called with invalid parameter")
    }

    // If state is not a number, return
    if(state === null || state === undefined) {
      reply.status(500);
      return;
    }

    currentState = state;
    setState(state);
    reply.status(200);
  } catch (error) {
    console.error(error);
    reply.status(500).send({ success: false, message: 'An error occurred' });
  }
});

fastify.post('/toggleState', (req, reply) => {
  try {
    // Set isSolid state on esp
    fetch(espAddress + "/toggleState", {
      method: 'POST',
    })
      .catch(error => {
        console.error('Error:', error);
      });

    reply.status(200);
  } catch (error) {
    console.error(error);
    reply.status(500).send({ success: false, message: 'An error occurred' });
  }
});

/**
 * Endpoint to delete a single notification of a single device
 * Takes two url parameters: ?name: name of the device, ?index: index of the notification to be deleted
 */
fastify.delete('/clearNotification', async (request, reply) => {
  if(!notifications) {
    reply.status(500);
    return;
  }

  // gets the '?name=' and '?index=' parameter
  const deviceName = request.query.name;
  const index = request.query.index;

  // Get notification array of device, 404 if device was not found
  const notificationsOfDevice = notifications.find(o => o.name === deviceName);
  if(!notificationsOfDevice) {
    reply.status(404);
    return;
  }

  // Return with 400, if index is invalid
  if (index < 0 || index > notificationsOfDevice.notifications.length - 1) {
    reply.status(400);
    return;
  }
  // Remove notification at index from array
  notificationsOfDevice.notifications.splice(index, 1);

  // After removing notification, set state to last notification entry
  const notificationLength = notificationsOfDevice.notifications.length;
  // If there are remaining notifications, pick most recent one after deleting

  if (deviceName === DEFAULT_DEVICE_NAME) {
    if(notificationLength > 0) {
      const state = notificationsOfDevice.notifications[notificationsOfDevice.notifications.length - 1];
      setState(state);
    } else {
      setState(DEFAULT_STATE_NUMBER);
    }
  }
  reply.status(200);
});

fastify.get('/deviceAddress', async (request, reply) => {
  reply.status(200).send({address: espAddress});
});

// Set leds on esp32 microcontroller
fastify.post('/led', async (request, reply) => {
  try {
    // Process the request and perform any necessary operations
    const data = request.body; // Access the request body

    const red = data["red"];
    const green = data["green"];
    const blue = data["blue"];

    // Return if payload is not valid
    //TODO: check if incoming payload is valid before passing on
    // if(!red || !green || !blue) {
    //   console.log("validation failed")
    //   reply.status(500).send({ success: false, message: 'An error occurred' });
    //   return;
    // }

    // console.log("validation passed!")

    // console.log("Red: " + red + ", green: " + green + ", blue: " + blue);

    // const payload = {
    //   "red": red,
    //   "green": green,
    //   "blue": blue
    // }

    // TODO: just pass data, no need to reformat (maybe)
    // Send post request to esp (with incoming payload)
    setLed(data);

    // Send the response
    reply.send({ success: true, message: 'Data received successfully' });
  } catch (error) {
    console.error(error);
    reply.status(500).send({ success: false, message: 'An error occurred' });
  }
})

// Run the server!
fastify.listen({ port: 80, host:"0.0.0.0" }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  // Server is now listening on ${address}
})


// Helpers
/**
 *
 * @param {string} deviceName what device to update notification for
 * @returns the generated notification
 */
function updateNotifications(deviceName) {
  // Returns notification object, if device name is already stored
  // e.g. {name: "Planty", notifications: [1]}
  const notificationsOfDevice = notifications.find(o => o.name === deviceName);

  // Generate new random notification to "send"
  const randomNotification = generateRandomNotification();

  // If no notification object for device is stored, generate new one and add notification
  if(!notificationsOfDevice) {
    notifications.push({name: deviceName, notifications: [randomNotification]});
    console.log("Adding new notifications for: ", deviceName);
  } else {
    notificationsOfDevice.notifications.push(randomNotification);
    console.log("Notifications for device '" + deviceName + "': ", notificationsOfDevice.notifications);
  }

  return randomNotification;
}

/**
 * Sends a request to set LED on esp32 microcontroller
 * @param {*} payload must be of structure {red: 0-255, green: 0-255, blue: 0-255}
 */
function setLed(payload) {
  fetch(espAddress + "/led", {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain'
    },
    body: JSON.stringify(payload)
  })
    .catch(error => {
      console.error('Error:', error);
    });
}

/**
 * Set microcontroller state (led color)
 * @param {number} state state to set microcontroller to
 */
function setState(state) {
  const isLedSolid = state % 2 === 1 || state === -1;
    const payload = {
      isSolid: isLedSolid
    };
    console.log("Payload: ",JSON.stringify(payload));

    // Set isSolid state on esp
    fetch(espAddress + "/setState", {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify(payload)
    })
      .catch(error => {
        console.error('Error:', error);
      });

    // Set led state
    // TODO: use enum for state/update server to support typescript
    if (state === 0 || state === 1) {
      setLed(water);
    } else if (state === 2 || state === 3) {
      setLed(sun)
    } else if (state === 4 || state === 5) {
      setLed(fertilizer);
    } else if (state === -1) {
      setLed(defaultState);
    }
}

// Adjust this for different notifications
// Returns random number between 0 and 5
function generateRandomNotification() {
  return getRandomInt(0,5);
}

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 */
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
