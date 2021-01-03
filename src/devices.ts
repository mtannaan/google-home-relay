import {SmartHomeV1SyncDevices} from 'actions-on-google';

export const devices: SmartHomeV1SyncDevices[] = [
  {
    id: 'lamp1',
    type: 'action.devices.types.LIGHT',
    traits: [
      'action.devices.traits.OnOff',
      // 'action.devices.traits.Brightness',
      // 'action.devices.traits.ColorSetting',
    ],
    name: {
      defaultNames: ['lamp1'],
      name: 'lamp1',
      nicknames: ['lamp'],
    },
    willReportState: false,
    // roomHint: 'office',
    attributes: {
      commandOnlyOnOff: true,
      // colorModel: 'rgb',
      // colorTemperatureRange: {
      //   temperatureMinK: 2000,
      //   temperatureMaxK: 9000,
      // },
      // commandOnlyColorSetting: false,
    },
    // deviceInfo: {
    //   manufacturer: 'lights out inc.',
    //   model: 'hg11',
    //   hwVersion: '1.2',
    //   swVersion: '5.4',
    // },
    customData: {
      //   fooValue: 12,
      //   barValue: false,
      //   bazValue: 'bar',
    },
  },
];
