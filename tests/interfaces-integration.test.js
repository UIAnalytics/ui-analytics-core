import { track } from '../src/tracking'
import integration from '../src/integration'
import { clear as clearState, get as getState } from '../src/state'
import { setLogLevel } from '../src/utils/logger'

describe.only('UIAnalytics.integration', ()=>{

  const trackObjectWithFields = (fields)=>{
    return Object.assign({
      type: 'track',
      name: '',
      properties: {},
      trackOptions: {},
      integrationWhitelist: ['all'],
      integrationBlacklist: [],
      runTransform: expect.any(Function)
    }, fields);
  };

  beforeEach(() => {
    clearState();
    setLogLevel(/*noLogs*/);
  });

  test('creating an integration and consuming track calls that happened before it has initialized', (done) => {

    let trackCount = 0;

    integration('a', {
      initialize: ()=> Promise.resolve(),
      track: (track)=>{
        return new Promise((resolve)=>{
          trackCount++;

          // this makes sure we can send more than one and the order is maintained
          if(trackCount === 1){
            expect(track).toEqual(trackObjectWithFields({name:'eventA', properties: {propA: true} }));
          }else {
            expect(track).toEqual(trackObjectWithFields({
              name:'eventB',
              properties: {propB: false},
              integrationWhitelist: ['a'],
              trackOptions: {
                integrationWhitelist: ['a']
              }
            }));
          }

          resolve();

          if(trackCount === 2){
            done();
          }
        }).catch(done);
      }
    });

    track('eventA', {propA: true});
    track('eventB', {propB: false}, {integrationWhitelist: ['a']});
    track('eventC', {propC: false}, {integrationWhitelist: ['c']});
    track('eventD', {propD: false}, {integrationBlacklist: ['a']});
  });

  test('creating an integration and consuming track calls that happen after it has initialized', (done) => {

    let trackCount = 0;

    integration('a', {
      initialize: ()=> Promise.resolve(),
      track: (track)=>{
        return new Promise((resolve)=>{
          trackCount++;

          // this makes sure we can send more than one and the order is maintained
          if(trackCount === 1){
            expect(track).toEqual(trackObjectWithFields({name:'eventA', properties: {propA: true} }));
          }else {
            expect(track).toEqual(trackObjectWithFields({
              name:'eventB',
              properties: {propB: false},
              integrationWhitelist: ['a'],
              trackOptions: {
                integrationWhitelist: ['a']
              }
            }));
          }

          resolve();

          if(trackCount === 2){
            done();
          }
        }).catch(done);
      }
    });

    setTimeout(()=>{
      // thes tracks are effectively called after the integration is initialized
      track('eventD', {propD: false}, {integrationBlacklist: ['a']});
      track('eventA', {propA: true});
      track('eventC', {propC: false}, {integrationWhitelist: ['c']});
      track('eventB', {propB: false}, {integrationWhitelist: ['a']});
    },50);

  });

  test('create an integration via reference, receive track events and then initializing it when we get a delayed integration definition', (done) => {

    let trackCount = 0;

    integration('a');

    expect(getState().integrations).toHaveLength(1);

    const integrationViaReference = getState().integrations[0];

    // thes tracks are effectively called after the integration is initialized
    track('eventD', {propD: false}, {integrationBlacklist: ['a']});
    track('eventA', {propA: true});
    track('eventC', {propC: false}, {integrationWhitelist: ['c']});
    track('eventB', {propB: false}, {integrationWhitelist: ['a']});

    setTimeout(()=>{

      integration('a', {
        initialize: ()=> Promise.resolve(),
        track: (track)=>{
          return new Promise((resolve)=>{
            trackCount++;

            // this makes sure we can send more than one and the order is maintained
            if(trackCount === 1){
              expect(track).toEqual(trackObjectWithFields({name:'eventA', properties: {propA: true} }));
            }else {
              expect(track).toEqual(trackObjectWithFields({
                name:'eventB',
                properties: {propB: false},
                integrationWhitelist: ['a'],
                trackOptions: {
                  integrationWhitelist: ['a']
                }
              }));
            }

            resolve();

            if(trackCount === 2){

              expect(getState().integrations).toHaveLength(1);
              expect(integrationViaReference).toEqual(getState().integrations[0]);

              done();
            }
          }).catch(done);
        }
      });
    }, 10);

  });

  test('create an integration with an synchronous intitialization and tracking', (done) => {

    let trackCount = 0;

    // thes tracks are effectively called after the integration is initialized
    track('eventD', {propD: false}, {integrationBlacklist: ['a']});
    track('eventA', {propA: true});
    track('eventC', {propC: false}, {integrationWhitelist: ['c']});
    track('eventB', {propB: false}, {integrationWhitelist: ['a']});

    setTimeout(()=>{

      integration('a', {
        initialize: ()=> {},
        track: (track)=>{
          trackCount++;

          // this makes sure we can send more than one and the order is maintained
          if(trackCount === 1){
            expect(track).toEqual(trackObjectWithFields({name:'eventA', properties: {propA: true} }));
          }else {
            expect(track).toEqual(trackObjectWithFields({
              name:'eventB',
              properties: {propB: false},
              integrationWhitelist: ['a'],
              trackOptions: {
                integrationWhitelist: ['a']
              }
            }));
          }

          if(trackCount === 2){
            done();
          }
        }
      });
    }, 10);

  });

  describe('query, subscribe, recieve, and unsubscribe from integration status changes', ()=>{

    test('get integration initialization state change notifications', ()=>{

      const callbackMock1 = jest.fn();
      const callbackMock2 = jest.fn();
      const callbackMock3 = jest.fn();
      const callbackMock4 = jest.fn();

      integration('int').on('ready', callbackMock1);
      integration('int-2').on('ready', callbackMock2);
      integration('int').on('before-init', callbackMock3);
      integration('int-2').on('before-init', callbackMock4);

      const unsub1 = integration('int').on('ready', callbackMock1);

      integration('not-int', {
        initialize: ()=> {},
        track: ()=>{}
      });

      const unsub2 = integration('int').on('ready', callbackMock1);

      integration('int').off('ready', unsub2);
      integration('int').off('ready', unsub1);

      integration('int', {
        initialize: ()=> {},
        track: ()=>{}
      });

      integration('int-2', {
        initialize: ()=>{
          return Promise.resolve();
        },
        track: ()=>{}
      });

      return Promise.resolve().then(()=>{
        integration('int').on('ready', callbackMock1);
        integration('int-2').on('ready', callbackMock2);
        integration('int').on('ready', callbackMock1);

        expect(callbackMock1.mock.calls).toHaveLength(3);
        expect(callbackMock2.mock.calls).toHaveLength(2);
        expect(callbackMock3.mock.calls).toHaveLength(1);
        expect(callbackMock4.mock.calls).toHaveLength(1);
      })
    });

    test('get integration error notifications', (done)=>{
      const callbackMock1 = jest.fn();
      const callbackMock2 = jest.fn();

      integration('int').on('error', callbackMock1);
      integration('int-2').on('error', callbackMock2);
      integration('int').on('error', callbackMock1);

      integration('int', {
        initialize: ()=> {
          throw 'some sync error happend'
        }
      });

      integration('int-2', {
        initialize: ()=>{
          return Promise.reject('some async error happend');
        }
      });

      expect(callbackMock1.mock.calls).toHaveLength(2);
      expect(callbackMock1.mock.calls[0][0]).toEqual({ error: 'some sync error happend'})
      expect(callbackMock1.mock.calls[1][0]).toEqual({ error: 'some sync error happend'})

      setImmediate(()=>{
        expect(callbackMock2.mock.calls).toHaveLength(1);
        expect(callbackMock2.mock.calls[0][0]).toEqual({ error: 'some async error happend'})
        done();
      })
    });

    test('query integration ready state and status', (done)=>{

      expect(integration('int').isReady()).toEqual(false);
      expect(integration('int-2').isReady()).toEqual(false);
      expect(integration('int-3').isReady()).toEqual(false);
      expect(integration('int-4').isReady()).toEqual(false);

      expect(integration('int').status()).toEqual('pending-definition');
      expect(integration('int-2').status()).toEqual('pending-definition');
      expect(integration('int-3').status()).toEqual('pending-definition');
      expect(integration('int-4').status()).toEqual('pending-definition');

      integration('int', {
        initialize: ()=> {},
        track: ()=>{}
      });

      integration('int-2', {
        initialize: ()=>{
          expect(integration('int-2').status()).toEqual('initializing');
          return Promise.resolve();
        },
        track: ()=>{}
      });

      integration('int-3', {
        initialize: ()=> { throw 'testing errors int-3'},
        track: ()=>{}
      });

      integration('int-4', {
        initialize: ()=>{
          expect(integration('int-4').status()).toEqual('initializing');
          return Promise.reject();
        },
        track: ()=>{}
      });

      setTimeout(()=>{

        expect(integration('int').status()).toEqual('ready');
        expect(integration('int-2').status()).toEqual('ready');
        expect(integration('int-3').status()).toEqual('errored');
        expect(integration('int-4').status()).toEqual('errored');

        expect(integration('int').isReady()).toEqual(true);
        expect(integration('int-2').isReady()).toEqual(true);
        expect(integration('int-3').isReady()).toEqual(false);
        expect(integration('int-4').isReady()).toEqual(false);

        done()
      },0)
    });
  });

});
