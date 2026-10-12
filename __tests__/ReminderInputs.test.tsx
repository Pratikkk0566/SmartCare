jest.mock('@tabler/icons-react-native',()=>{const React=require('react'),{View}=require('react-native');const Icon=props=>React.createElement(View,props);return {IconCircleCheck:Icon,IconCircleX:Icon,IconInfoCircle:Icon,IconAlertTriangle:Icon};});
import React from 'react';
import renderer,{act} from 'react-test-renderer';
import RoutineTimeInput from '../src/components/medication/RoutineTimeInput';
import SimpleNotificationPopup from '../src/components/notifications/SimpleNotificationPopup';
test('AM/PM selector preserves the entered time',()=>{
 const change=jest.fn();let tree;act(()=>{tree=renderer.create(<RoutineTimeInput label="Afternoon" value="02:15 AM" onChange={change}/>);});
 act(()=>tree.root.findAllByProps({accessibilityLabel:'Afternoon PM'})[0].props.onPress());
 expect(change).toHaveBeenCalledWith('02:15 PM');act(()=>tree.unmount());
});
test('warning notification renders without unsupported native width animation',()=>{
 jest.useFakeTimers();const errors=jest.spyOn(console,'error').mockImplementation(()=>{});let tree;
 act(()=>{tree=renderer.create(<SimpleNotificationPopup visible type="warning" title="Reminder" onDismiss={jest.fn()}/>);});
 expect(tree.toJSON()).not.toBeNull();expect(errors.mock.calls.some(args=>args.join(' ').includes("Style property 'width'"))).toBe(false);
 act(()=>tree.unmount());errors.mockRestore();jest.clearAllTimers();jest.useRealTimers();
});

test('editing/deleting either digit field never removes the colon',()=>{
 const change=jest.fn();let tree;
 act(()=>{tree=renderer.create(<RoutineTimeInput label="Afternoon" value="02:15 PM" onChange={change}/>);});
 act(()=>tree.root.findAllByProps({accessibilityLabel:'Afternoon hours'})[0].props.onChangeText(''));
 expect(change).toHaveBeenLastCalledWith(':15 PM');
 act(()=>tree.root.findAllByProps({accessibilityLabel:'Afternoon minutes'})[0].props.onChangeText('45'));
 expect(change).toHaveBeenLastCalledWith('02:45 PM');
 act(()=>tree.unmount());
});
