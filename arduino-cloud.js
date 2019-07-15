module.exports = function(RED) {
  function ArduinoIotInput(config) {
      RED.nodes.createNode(this, config);
      var node = this;
      var promise = RED.settings.functionGlobalContext.arduinoConnectionManager;
      promise.then((arduinoConnectionManager) => {
        const ArdarduinCloudMessageClient = arduinoConnectionManager.apiMessage;
        if (ArdarduinCloudMessageClient) {
          ArdarduinCloudMessageClient.onPropertyValue(config.thing, config.name, message => {
            const timestamp = (new Date()).getTime();
            node.send(
              {
                topic: config.name,
                payload: message,
                timestamp: timestamp
              }            
            );
          }).then(() => {
            node.on('close', function(done) {
              ArdarduinCloudMessageClient.removePropertyValueCallback(config.thing, config.name).then( () => {
                done();
              });
            });
          });
        }
      });
  }
  RED.nodes.registerType("property in", ArduinoIotInput);

  function ArduinoIotOutput(config) {
      RED.nodes.createNode(this, config);
      var node = this;
      var promise = RED.settings.functionGlobalContext.arduinoConnectionManager;
      promise.then((arduinoConnectionManager) => {
        const ArdarduinCloudMessageClient = arduinoConnectionManager.apiMessage;
        if (ArdarduinCloudMessageClient) {
          node.on('input', function(msg) {
            const timestamp =   (new Date()).getTime();
            ArdarduinCloudMessageClient.sendProperty(config.thing, config.name, msg.payload, timestamp).then(() => {
            });
        });
      }
    });
  }
  RED.nodes.registerType("property out", ArduinoIotOutput);

  var moment = require("moment");

  function ArduinoIotInputPull(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    this.last = config.last;
    this.timeWindowCount = config.timeWindowCount;
    this.timeWindowUnit = config.timeWindowUnit;

    var promise = RED.settings.functionGlobalContext.arduinoConnectionManager;
    promise.then((arduinoConnectionManager) => {
      if(this.last) {
        const ArduinoCloudRESTClient = arduinoConnectionManager.apiRest;
        if (ArduinoCloudRESTClient) {
          node.on('input', function() {
            ArduinoCloudRESTClient.getProperty(config.thing, config.propid).then( (result) => {
              const timestamp = (new Date()).getTime();
              let payload = result.last_value;
              /*if (payload === "true") {
                payload = true;
              } else if (payload === "false"){
                payload = false;
              } else {
                if(!isNaN(payload)) payload = parseFloat(payload);
              }
              */
              node.send(
                {
                  topic: config.name,
                  payload: payload,
                  timestamp: timestamp
                }  
              );
            });
          });
        }
      } else {
        const ArduinoCloudRESTClient = arduinoConnectionManager.apiRest;
        if (ArduinoCloudRESTClient) {
          node.on('input', function() {
            const now = moment();
            const end = now.format();
            const start = now.subtract(this.timeWindowCount * this.timeWindowUnit, 'second').format();

            ArduinoCloudRESTClient.getSeries(config.thing, config.propid, start, end).then( (result) => {
              const times = result.responses[0].times;
              const values = result.responses[0].values;
              let data = [];
              if(values && times) {
                values.forEach(function (item, index, array) {
                  data.push({
                    x: moment(times[index]).unix() * 1000,
                    y: values[index]
                  });
                });
              }
              node.send(
                {
                  topic: config.name,
                  payload: [{
                    series: [],
                    data: [data]
                  }]
                }  
              );
            });
          });
        }
      }
    });  
  }
  RED.nodes.registerType("property in pull", ArduinoIotInputPull);

  RED.httpAdmin.get("/things", RED.auth.needsPermission('Property-in.read'), function(req,res) {
    var promise = RED.settings.functionGlobalContext.arduinoConnectionManager;
    promise.then((arduinoConnectionManager) => {
      const ArduinoRestClient = arduinoConnectionManager.apiRest;
      ArduinoRestClient.getThings()
      .then(things => {
        return res.send(JSON.stringify(things));
      }).catch(err => {
        console.log(err);
      });
    }); 
  });

  RED.httpAdmin.get("/properties", RED.auth.needsPermission('Property-in.read'), function(req,res) {
    var promise = RED.settings.functionGlobalContext.arduinoConnectionManager;
    promise.then((arduinoConnectionManager) => {
      const thing_id = req.query.thing_id;
      const ArduinoRestClient =  arduinoConnectionManager.apiRest;
      ArduinoRestClient.getProperties(thing_id)
      .then(properties => {
        return res.send(JSON.stringify(properties));
      })
      .catch(err => {
        console.log(err);
      });
    });
  });
}
