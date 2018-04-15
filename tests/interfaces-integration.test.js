import { track } from '../src/tracking'
import integration from '../src/integration'
import { clear as clearState } from '../src/state'

describe.only('UIAnalytics.integration', ()=>{
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
            expect(track.name).toEqual('eventA');
            expect(track.properties).toEqual({propA: true});
            expect(track.trackOptions).toEqual({});
            expect(track.integrationWhitelist).toEqual(['all']);
            expect(track.integrationBlacklist).toEqual([]);
          }else {
            expect(track.name).toEqual('eventB');
            expect(track.properties).toEqual({propB: false});
            expect(track.trackOptions).toEqual({ integrationWhitelist: ['a'] });
            expect(track.integrationWhitelist).toEqual(['a']);
            expect(track.integrationBlacklist).toEqual([]);
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


  test.skip('creating an integration and consuming track calls that happen after it has initialized', (done) => {

    let trackCount = 0;

    integration('a', {
      initialize: ()=> Promise.resolve(),
      track: (track)=>{
        return new Promise((resolve)=>{
          trackCount++;

          // this makes sure we can send more than one and the order is maintained
          if(trackCount === 1){
            expect(track.name).toEqual('eventA');
            expect(track.properties).toEqual({propA: true});
            expect(track.trackOptions).toEqual({});
            expect(track.integrationWhitelist).toEqual(['all']);
            expect(track.integrationBlacklist).toEqual([]);
          }else {
            expect(track.name).toEqual('eventB');
            expect(track.properties).toEqual({propB: false});
            expect(track.trackOptions).toEqual({ integrationWhitelist: ['a'] });
            expect(track.integrationWhitelist).toEqual(['a']);
            expect(track.integrationBlacklist).toEqual([]);
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
});
