const {
  IvsClient,
  DeleteChannelCommand,
  StopStreamCommand
} = require('@aws-sdk/client-ivs');
const axios = require('axios');
const jwt = require('jsonwebtoken');

exports.handler = async (event) => {

  const ivsClient = new IvsClient({
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_IVS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_IVS_SECRET_ACCESS_KEY,
    }
  });

  const zoomToken = jwt.sign({
    exp: Math.floor(Date.now() / 1000) + (6 * 6),
    iss: process.env.ZOOM_VIDEO_SDK_API_KEY
  }, process.env.ZOOM_VIDEO_SDK_API_SECRET);

  return ivsClient.send(new StopStreamCommand({
    channelArn: event.arn
  })).then((stopStreamResponse) => {
    console.log(stopStreamResponse);

    return axios.patch(`https://api.zoom.us/v2/videosdk/sessions/${encodeURIComponent(encodeURIComponent(event.sessionId))}/livestream/status`, {
      action: 'stop'
    }, {
      headers: {
        authorization: `Bearer ${zoomToken}`
      }
    }).then(endStreamResponse => {
      console.log(`statusCode: ${endStreamResponse.status}`);
      console.log(endStreamResponse);

        return {
          statusCode: 200,
          body: JSON.stringify({}),
        };

    }).catch(endStreamError => {
      console.log('endStreamError', endStreamError);

      return {
        statusCode: 500,
        body: JSON.stringify(endStreamError),
      };
    });

  }, (stopStreamError) => {
    console.log('stopStreamError', stopStreamError);

    return {
      statusCode: 500,
      body: JSON.stringify(stopStreamError),
    };
  });
};