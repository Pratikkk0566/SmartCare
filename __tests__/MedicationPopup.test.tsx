jest.mock('../src/services/LocalAlarmManager', () => ({localAlarmManager: {getRingtone: jest.fn().mockResolvedValue('alarm'), setRingtone: jest.fn().mockResolvedValue(), openRingtoneSettings: jest.fn().mockResolvedValue()}}));
import React from 'react';
import renderer, {act} from 'react-test-renderer';
import MedicationNotificationPopup from '../src/components/notifications/MedicationNotificationPopup';

test('delivered reminder renders as a fullscreen modal', () => {
  jest.useFakeTimers();
  let tree;
  act(() => { tree = renderer.create(<MedicationNotificationPopup visible medicationData={{medicineName:'Test medicine',dosage:'1 tablet',scheduledTime:'14:00'}} onDismiss={jest.fn()} onTake={jest.fn()} onSkip={jest.fn()} onSnooze={jest.fn()} />); });
  expect(tree.toJSON()).not.toBeNull();
  expect(tree.root.findAllByProps({presentationStyle:'fullScreen'})[0].props.visible).toBe(true);
  act(() => tree.unmount());
  jest.clearAllTimers();jest.useRealTimers();
});

test('fullscreen reminder passes the selected snooze delay to the existing dose action', async () => {
 const onSnooze=jest.fn().mockResolvedValue(undefined), data={medicineName:'Test medicine',scheduledTime:'14:00'};
 let tree;
 act(()=>{tree=renderer.create(<MedicationNotificationPopup visible medicationData={data} onSnooze={onSnooze} onDismiss={jest.fn()} />);});
 act(()=>tree.root.findAllByProps({accessibilityLabel:'Snooze delay 30 minutes'})[0].props.onPress());
 await act(async()=>{await tree.root.findAllByProps({accessibilityLabel:'Snooze reminder'})[0].props.onPress();});
 expect(onSnooze).toHaveBeenCalledWith(data,30);
 act(()=>tree.unmount());
});

test('default fullscreen snooze is five minutes',async()=>{
 const snooze=jest.fn(),data={medicineName:'Test medicine'};let tree;
 act(()=>{tree=renderer.create(<MedicationNotificationPopup visible medicationData={data} onSnooze={snooze}/>);});
 await act(async()=>{await tree.root.findAllByProps({accessibilityLabel:'Snooze reminder'})[0].props.onPress();});
 expect(snooze).toHaveBeenCalledWith(data,5);act(()=>tree.unmount());
});
