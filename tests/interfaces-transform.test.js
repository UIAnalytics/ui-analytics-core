import { track } from '../src/tracking'
import integration from '../src/integration'
import { transform } from '../src/transform'
import { clear as clearState, get as getState } from '../src/state'
import { setLogLevel } from '../src/utils/logger'

describe('UIAnalytics.transform', ()=>{

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

  describe('firehose of input scenarios', ()=>{
    const getTrackFromStateByName = (name)=>{
      return getState().tracks.filter(t=>t.name === name)[0];
    };

    test('adding a transform should update all tracks currently in the internal queue', ()=>{

      track('t1', {p1: true});
      track('t2', {p2: true});
      track('t3', {p3: true});
      expect(getTrackFromStateByName('t1').properties).toEqual({p1: true});
      expect(getTrackFromStateByName('t2').properties).toEqual({p2: true});
      expect(getTrackFromStateByName('t3').properties).toEqual({p3: true});

      // makes sure we run it on every prop
      transform((t)=>{
        t.properties.allProp = 1;
        return t;
      });

      // makes sure we run multiple transforms in order
      transform((t)=>{
        if(t.name === 't2'){
          t.properties.allProp = 2;
        }
        return t;
      });

      expect(getTrackFromStateByName('t1').properties).toEqual({p1: true, allProp: 1});
      expect(getTrackFromStateByName('t2').properties).toEqual({p2: true, allProp: 2});
      expect(getTrackFromStateByName('t3').properties).toEqual({p3: true, allProp: 1});
    });

    test('all new tracks should go through transforms', ()=>{

      // makes sure we run it on every prop
      transform((t)=>{
        t.properties.allProp = 1;
        return t;
      });

      // makes sure we run multiple transforms in order
      transform((t)=>{
        if(t.name === 't2'){
          t.properties.allProp = 2;
        }
        return t;
      });

      track('t1', {p1: true});
      track('t2', {p2: true});
      track('t3', {p3: true});

      expect(getTrackFromStateByName('t1').properties).toEqual({p1: true, allProp: 1});
      expect(getTrackFromStateByName('t2').properties).toEqual({p2: true, allProp: 2});
      expect(getTrackFromStateByName('t3').properties).toEqual({p3: true, allProp: 1});
    });

    test('empty transform should not remove the track and should leave it unmodified', ()=>{
      transform();
      track('t1', {p1: true});
      expect(getState().tracks).toHaveLength(1);
      expect(getState().tracks[0]).toEqual(trackObjectWithFields({name: 't1', properties: {p1:true}}));
    });

    test('a transform should not be able to remove the track name and should leave it unmodified', ()=>{
      transform((t)=>{
        t.name = ' ';
        return t;
      });
      track('t1', {p1: true});
      expect(getState().tracks).toHaveLength(1);
      expect(getState().tracks[0]).toEqual(trackObjectWithFields({name: 't1', properties: {p1:true}}));
    });

    test('a transform should not leave the track in a broken structure', ()=>{
      transform((t)=>{
        return {
          name: 'changed'
        };
      });
      track('t1', {p1: true});
      expect(getState().tracks).toHaveLength(1);
      expect(getState().tracks[0]).toEqual(trackObjectWithFields({name: 'changed', integrationWhitelist: []}));
    });
  });

  test('creating an integration, adding a transform, and consuming track calls that happened before it has initialized', (done) => {

    let trackCount = 0;

    integration('a', {
      initialize: ()=> Promise.resolve(),
      track: (track)=>{
        return new Promise((resolve)=>{
          trackCount++;

          // this makes sure we can send more than one and the order is maintained
          if(trackCount === 1){
            expect(track).toEqual(trackObjectWithFields({
              name: 'eventA',
              properties: {propA: false}
            }));
          }else {
            expect(track).toEqual(trackObjectWithFields({
              name: 'eventB',
              properties: {propA: true, propB: false},
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

    transform((track)=>{
      if(track.properties.propA){
        track.properties.propA = false;
      }else {
        track.properties.propA = true;
      }
      return track;
    })

    track('eventA', {propA: true});
    track('eventB', {propB: false}, {integrationWhitelist: ['a']});
    track('eventC', {propC: false}, {integrationWhitelist: ['c']});
    track('eventD', {propD: false}, {integrationBlacklist: ['a']});
  });


  test('creating an integration, adding a transform, and consuming track calls that happen after it has initialized', (done) => {

    let trackCount = 0;

    integration('a', {
      initialize: ()=> Promise.resolve(),
      track: (track)=>{
        return new Promise((resolve)=>{
          trackCount++;

          // this makes sure we can send more than one and the order is maintained
          if(trackCount === 1){
            expect(track).toEqual(trackObjectWithFields({
              name: 'eventA',
              properties: {propA: false}
            }));
          }else {
            expect(track).toEqual(trackObjectWithFields({
              name: 'eventB',
              properties: {propA: true, propB: false},
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

    transform((track)=>{
      if(track.properties.propA){
        track.properties.propA = false;
      }else {
        track.properties.propA = true;
      }
      return track;
    })

    setTimeout(()=>{
      // thes tracks are effectively called after the integration is initialized
      track('eventD', {propD: false}, {integrationBlacklist: ['a']});
      track('eventA', {propA: true});
      track('eventC', {propC: false}, {integrationWhitelist: ['c']});
      track('eventB', {propB: false}, {integrationWhitelist: ['a']});
    },0)

  });
});
