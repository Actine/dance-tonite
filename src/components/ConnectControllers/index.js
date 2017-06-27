/** @jsx h */
import { h, Component } from 'preact';

import viewer from '../../viewer';
import deps from '../../deps';

import RoomInstructions from '../RoomInstructions';

export default class ConnectControllers extends Component {
  constructor() {
    super();
    this.tick = this.tick.bind(this);
  }

  componentDidMount() {
    this.mounted = true;
    viewer.on('tick', this.tick);
  }

  componentWillUnmount() {
    this.mounted = false;
    viewer.off('tick', this.tick);
  }

  tick() {
    const count = deps.controllers.countActiveControllers();
    if (count === this.state.count) return;
    this.setState({ count });
    if (count === 2) {
      if (this.props.onConnected) this.props.onConnected();
    } else if (this.props.onDisconnected) {
      this.props.onDisconnected();
    }
  }

  render(props, { count }) {
    return (
      <RoomInstructions
        subtitle={
          count === 2
            ? 'press right controller to start'
            : count === 1
              ? 'turn on both of your controllers'
              : 'turn on your controllers\nthen press any button to begin'
        }
      />
    );
  }
}
