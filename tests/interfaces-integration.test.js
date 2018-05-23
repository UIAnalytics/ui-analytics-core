import { track } from '../src/tracking'
import { identifyUser } from '../src/user'
import integration from '../src/integration'
import { clear as clearState, get as getState } from '../src/state'
import { setLogLevel } from '../src/utils/logger'

describe('UIAnalytics.integration', ()=>{

  const trackObjectWithFields = (fields)=>{
    return Object.assign({
      type: 'track',
      name: '',
      properties: {},
      trackOptions: {},
      integrationWhitelist: ['all'],
      integrationBlacklist: [],
      groups: [],
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
    },0);
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

  test('retrieving the integration tool reference', ()=>{

    expect(integration('test-a').getToolReference()).toEqual(undefined);

    let library;

    integration('test-a', {
      initialize: ()=>{

        expect(integration('test-a').getToolReference()).toEqual(undefined);

        library = { ref: true };
      },
      getToolReference: ()=>{
        return library;
      }
    });

    expect(integration('test-a').getToolReference()).toEqual(library);
    expect(library).toEqual({ ref: true });
  });

  describe('integration options configuration', ()=>{

    test('set integration options', ()=>{

      integration('test-options').options({
        apiKey: 'abc123'
      });

      const setOptionsMock = jest.fn();

      integration('test-options', {
        initialize: ()=>{},
        setOptions: setOptionsMock
      });

      return Promise.resolve().then(()=>{
        expect(setOptionsMock.mock.calls).toHaveLength(1);
        expect(setOptionsMock.mock.calls[0][0]).toEqual({
          apiKey: 'abc123'
        });

        integration('test-options').options({
          apiKey: 'abc123',
          otherThing: true
        });

        expect(setOptionsMock.mock.calls).toHaveLength(2);
        expect(setOptionsMock.mock.calls[1][0]).toEqual({
          apiKey: 'abc123',
          otherThing: true
        });
      });
    });

    test('integration consuming intitial options', ()=>{

      const initMock = jest.fn();

      integration('test-options', {
        initialize: initMock,
        initialOptions: {
          apiKey: 'abc123'
        }
      });

      expect(initMock.mock.calls).toHaveLength(1);
      expect(initMock.mock.calls[0][0]).toEqual({
        apiKey: 'abc123'
      });

    });
  })

  describe('targeting groups', ()=>{

    test('passing group configuration options', ()=>{

      const setGroupMock = jest.fn();
      const trackMock = jest.fn();

      integration('int-test', {
        initialize: ()=>{},
        setGroup: setGroupMock
      });

      integration('int-test').group('groupA').options({someGroupProps: true});

      return Promise.resolve().then(()=>{
        expect(setGroupMock.mock.calls).toHaveLength(1);
        expect(setGroupMock.mock.calls[0][0]).toEqual('groupA');
        expect(setGroupMock.mock.calls[0][1]).toEqual({someGroupProps: true});
      });
    });

    test('tracking values with a group', ()=>{

      const trackMock = jest.fn();

      integration('int-test', {
        initialize: ()=>{},
        track: trackMock
      });

      integration('int-test').group('groupA', {someGroupProps: true}).track('some thing');

      return Promise.resolve().then(()=>{
        expect(trackMock.mock.calls).toHaveLength(1);
        expect(trackMock.mock.calls[0][0].trackOptions).toEqual({
          integrationWhitelist: ['int-test'],
          groups: ['groupA']
        });
        expect(trackMock.mock.calls[0][0].groups).toEqual(['groupA']);

      });
    });
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

  describe('identifying the user', ()=>{
    test('calling #identifyUser should call our integration\'s identifyUser', ()=>{

      const userDef = {
        email: 'initialUser',
        otherProp: true
      };

      const userDef2 = {
        email: 'secondUser',
        otherProp: true
      };

      identifyUser(userDef)

      const identifyUserMock = jest.fn();

      integration('test-identify', {
        initialize: ()=>{},
        identifyUser: identifyUserMock
      });

      return Promise.resolve().then(()=>{

        // verifying the identify call gets picked up if identification
        // happened before integration definition
        expect(identifyUserMock.mock.calls).toHaveLength(1);
        expect(identifyUserMock.mock.calls[0][0]).toEqual(Object.assign({}, userDef));

        identifyUser(userDef2)

        // verifying that calling identify after integrations defined will invoke
        // the identifyUser definition function
        expect(identifyUserMock.mock.calls).toHaveLength(2);
        expect(identifyUserMock.mock.calls[1][0]).toEqual(Object.assign({}, userDef2));
      });
    });
  });
});
