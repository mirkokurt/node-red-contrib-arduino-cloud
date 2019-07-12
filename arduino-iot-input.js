module.exports = function(RED) {
  function ArduinoIotInput(config) {
      RED.nodes.createNode(this, config);
      var node = this;
      const ArdarduinCloudMessageClient = RED.settings.functionGlobalContext.arduinoConnectionManager.apiMessage;
      if (ArdarduinCloudMessageClient) {
        ArdarduinCloudMessageClient.onPropertyValue(config.thing, config.property, message => {
          const timestamp = (new Date()).getTime();
          node.send(
            {
              topic: config.property,
              payload: message,
              timestamp: timestamp
            }            
          );
        }).then(() => {
          node.on('close', function(done) {
            ArdarduinCloudMessageClient.removePropertyValueCallback(config.thing, config.property).then( () => {
              done();
            });
          });
        });
      }
  }

  RED.httpAdmin.get("/things", RED.auth.needsPermission('Property-in.read'), function(req,res) {
    const ArduinoRestClient = RED.settings.functionGlobalContext.arduinoConnectionManager.apiRest;
    ArduinoRestClient.getThings()
    .then(things => {
      return res.send(JSON.stringify(things));
    }).catch(err => {
      console.log(err);
    });
  });

  RED.httpAdmin.get("/properties", RED.auth.needsPermission('Property-in.read'), function(req,res) {
    const thing_id = req.query.thing_id;
    const ArduinoRestClient =  RED.settings.functionGlobalContext.arduinoConnectionManager.apiRest;
    ArduinoRestClient.getProperties(thing_id)
    .then(properties => {
      return res.send(JSON.stringify(properties));
    })
    .catch(err => {
      console.log(err);
    });
  });

  RED.nodes.registerType("Property-in", ArduinoIotInput);
}
