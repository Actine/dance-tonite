/** @jsx h */
import { h, Component } from 'preact';
import './style.scss';

import Menu from '../../components/Menu';
import CMSMenu from '../../components/CMSMenu';
import Container from '../../components/Container';
import Error from '../../components/Error';
import Align from '../../components/Align';
import Spinner from '../../components/Spinner';
import Titles from '../../components/Titles';
import ProgressBar from '../../components/ProgressBar';
import Colophon from '../../components/Colophon';
import Playlist from '../Playlist';
import ButtonItem from '../../components/ButtonItem';
import Overlay from '../../components/Overlay';

import audio from '../../audio';
import audioSrcOgg from '../../public/sound/tonite.ogg';
import audioSrcMp3 from '../../public/sound/tonite.mp3';
import viewer from '../../viewer';
import settings from '../../settings';
import transition from '../../transition';
import feature from '../../utils/feature';
import { sleep } from '../../utils/async';

export default class Playback extends Component {
  constructor() {
    super();

    this.onTitlesChanged = this.onTitlesChanged.bind(this);
    this.performExitPresent = this.performExitPresent.bind(this);
  }

  componentWillMount() {
    this.setState({
      hoverHead: null,
      orb: true,
      colophon: this.props.colophon !== false,
    });
  }

  componentDidMount() {
    this.mounted = true;
    this.asyncMount();
  }

  componentWillUnmount() {
    this.mounted = false;
    if (viewer.vrEffect.isPresenting) {
      viewer.vrEffect.exitPresent();
    }
  }

  onTitlesChanged(titles, colophon = true) {
    this.setState({
      orb: !titles,
      colophon,
    });
  }

  setLoading(loading) {
    this.setState({ loading });
  }

  performExitPresent() {
    if (viewer.vrEffect.isPresenting) {
      viewer.vrEffect.exitPresent();
    }
    this.forceUpdate();
  }

  async asyncMount() {
    const { inContextOfRecording, roomId } = this.props;
    if (!viewer.vrEffect.isPresenting) {
      viewer.switchCamera('orthographic');
    }
    if (!inContextOfRecording) {
      this.setLoading('Moving dancers into position…');
    }

    const audioLoadTime = Date.now();
    await audio.load({
      src: feature.isChrome ? audioSrcOgg : audioSrcMp3,
      loops: settings.totalLoopCount,
      loop: true,
      progressive: true,
    });
    if (!this.mounted) return;

    if (inContextOfRecording) {
      // Start at 3 rooms before the recording:
      const watchTime = 30;
      const roomOffset = 2;
      const startTime = (roomId - 2 + roomOffset) * audio.loopDuration;
      audio.gotoTime(startTime);
      setTimeout(async () => {
        // Return early if we unmounted in the meantime:
        if (!this.mounted) return;

        // Fade to black from viewer scene
        await Promise.all([
          audio.fadeOut(),
          transition.fadeOut(),
        ]);
        if (!this.mounted) return;

        this.setState({
          takeOffHeadset: true,
        });

        audio.pause();

        // Removes background color if any and stops moving camera:
        this.setState({ stopped: true });

        await transition.enter({
          text: 'Please take off your headset',
        });
      }, watchTime * 1000);
    }

    const timeLeft = 1500 - (Date.now() - audioLoadTime);
    if (timeLeft > 0) {
      await sleep(timeLeft);
      if (!this.mounted) return;
    }

    this.setLoading(null);
    if (transition.isInside()) {
      transition.exit();
    }

    // Safari won't play unless we wait until next tick
    setTimeout(() => {
      audio.play();
      audio.fadeIn();
    });
  }

  render(
    {
      roomId,
      id,
      inContextOfRecording,
      onGotoSubmission,
    },
    {
      error,
      loading,
      orb,
      colophon,
      takeOffHeadset,
      stopped,
    }
  ) {
    const polyfillAndPresenting = feature.vrPolyfill
      && viewer.vrEffect.isPresenting;

    if (polyfillAndPresenting) {
      return (
        <Container>
          <Playlist
            pathRecordingId={id}
            pathRoomId={roomId}
            orb={orb}
          />
          <Menu
            close={this.performExitPresent}
          />
        </Container>
      );
    }

    return (
      <div className="playback">
        {
          inContextOfRecording && (
            takeOffHeadset
              ? (
                <Overlay opaque>
                  <a onClick={onGotoSubmission}>
                    <span>I took off my headset</span>
                  </a>
                </Overlay>
              )
              : (
                <Align type="bottom-right">
                  <ButtonItem text="Skip Preview" onClick={onGotoSubmission} />
                </Align>
              )
          )
        }
        {process.env.FLAVOR !== 'cms' &&
          <Colophon hide={!loading && !colophon} />
        }
        <Playlist
          pathRecordingId={id}
          pathRoomId={roomId}
          orb={orb}
          stopped={stopped}
        />
        { process.env.FLAVOR !== 'cms'
          ? <Titles
            onUpdate={this.onTitlesChanged}
          />
          : null
        }
        {!inContextOfRecording && <ProgressBar />}
        <Align type="center">
          { error
            ? <Error>{error}</Error>
            : loading
              ? <Spinner
                text={`${loading}`}
              />
              : null
          }
        </Align>
      </div>
    );
  }
}
