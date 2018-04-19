import { track } from '../src/tracking'
import integration from '../src/integration'
import { clear as clearState, get as getState } from '../src/state'

describe('UIAnalytics.integration', ()=>{

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
    },50)

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

  test('create an extension with an synchronous intitialization and tracking', (done) => {

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
});
