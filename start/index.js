const { IvsClient, CreateChannelCommand } = require('@aws-sdk/client-ivs');
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

  return ivsClient.send(new CreateChannelCommand({
    name: event.topic
  })).then((createChannelResponse) => {
      console.log(createChannelResponse);

      return axios.patch(`https://api.zoom.us/v2/videosdk/sessions/${encodeURIComponent(encodeURIComponent(event.sessionId))}/livestream`, {
        stream_url: `rtmps://${createChannelResponse.channel.ingestEndpoint}:443/app/`,
        stream_key: createChannelResponse.streamKey.value,
        page_url: 'https://tommygaessler.com'
      }, {
        headers: {
          authorization: `Bearer ${zoomToken}`
        }
      }).then(setStreamResponse => {
        console.log(`statusCode: ${setStreamResponse.status}`);
        console.log(setStreamResponse);

        return axios.patch(`https://api.zoom.us/v2/videosdk/sessions/${encodeURIComponent(encodeURIComponent(event.sessionId))}/livestream/status`, {
          action: 'start'
        }, {
          headers: {
            authorization: `Bearer ${zoomToken}`
          }
        }).then(startStreamResponse => {
          console.log(`statusCode: ${startStreamResponse.status}`);
          console.log(startStreamResponse);

          return {
            statusCode: 200,
            body: JSON.stringify({
              playbackUrl: createChannelResponse.channel.playbackUrl,
              arn: createChannelResponse.channel.arn
            }),
          };
        }).catch(startStreamError => {
          console.log('startStreamError', startStreamError);

          return {
            statusCode: 500,
            body: JSON.stringify(startStreamError),
          };
        });
      }).catch(setStreamError => {
        console.log('setStreamError', setStreamError);

        return {
          statusCode: 500,
          body: JSON.stringify(setStreamError),
        };
      });

    }, (createChannelError) => {
      console.log('createChannelError', createChannelError);

      return {
        statusCode: 500,
        body: JSON.stringify(createChannelError),
      };
    }
  );
};