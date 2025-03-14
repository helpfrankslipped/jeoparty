import React, { useContext, useState, useEffect, useCallback } from 'react';
import emailjs from 'emailjs-com';

import _ from 'lodash';
import styled from 'styled-components';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import InputGroup from 'react-bootstrap/InputGroup';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Dropdown from 'react-bootstrap/Dropdown';
import SplitButton from 'react-bootstrap/SplitButton';
import { AiOutlineInfoCircle, AiOutlineMail } from 'react-icons/ai';
import { ImCancelCircle } from 'react-icons/im';

import { DebugContext } from '../../context/debug';
import { SocketContext } from '../../context/socket';
import { legalInfo } from '../../constants/info';
import mixins from '../../helpers/mixins';
import HypeText from '../../helpers/components/HypeText';

import lobbyMusicSound from '../../assets/audio/lobbyMusic.mp3';
import trebekIntroSound from '../../assets/audio/trebekIntro.mp3';

// DEBUG
import { sampleLeaderboard } from '../../constants/sampleLeaderboard';
import { samplePlayers } from '../../constants/samplePlayers';

const MuteScreen = styled.div`
    ${mixins.flexAlignCenter};
    position: absolute;
    z-index: 3;

    height: 100vh;
    width: 100vw;

    backdrop-filter: blur(8px);
`;

const MuteScreenText = styled.div`
    ${mixins.flexAlignCenter};
    position: absolute;
    z-index: 2;

    left: 50%;
    top: 50%;
    transform: translate(-50%,-50%);
`;

const MuteScreenButton = styled(Button)`
    font-family: clue, serif;
    font-size: 10vh;
`;

const ButtonWrapper = styled.div`
      cursor: pointer;
      position: absolute;
      top: 0;
      right: 0;
`;

const InfoButtonWrapper = styled.span`
    margin-left: 0.5em;
    margin-right: 0.5em;
`;

const EmailPanel = styled.div`
    position: relative;
    width: 500px;
    margin: 0 auto;
    padding: 1em;

    border-radius: 1em;
    border: 0.2em solid #fff;
`;

const EmailPanelCancelButton = styled.div`
    cursor: pointer;
    position: absolute;
    top: 0;
    right: 0;
    margin-right: 0.25em;
`;

const PatchNotesPanel = styled.div`
    background-color: white;
    color: black;

    margin: 1em;
    padding: 1em;
`;

const PatchNotesText = styled.p`
    word-break: break-word;
`;

const AsciiArtText = styled.p`
    white-space: pre;

    font-family: monospace;
    font-weight: bold;

    position: relative;
    animation: ${props => props.rainbow ? 'rainbow 1s, move-text 1s forwards' : 'move-text 1s forwards'};
    animation-iteration-count: ${props => props.rainbow ? 'infinite' : 1};
    animation-delay: ${props => `${0.5 + (props.index / 10)}s`};
    opacity: 0;
`;

const LogoRow = styled(Row)`
    ${mixins.flexAlignCenter}
`;

const LogoText = styled.h1`
    font-family: logo, serif;
    font-size: 28vh;
    text-shadow: 0.05em 0.05em #000;

    margin-bottom: 0;
`;

const LeaderboardText = styled.h5`
    font-family: clue, serif;
    font-size: 2.5vh;
    text-shadow: 0.1em 0.1em #000;
`;

const InfoText = styled.h5`
    font-family: clue, serif;
    font-size: 3vh;
    text-shadow: 0.1em 0.1em #000;
`;

const JoinText = styled(InfoText)`
    display: flex;
    flex-direction: row;

    padding-left: 28vw;
    padding-right: 28vw;

    &:before, :after {
        content: '';
        flex: 1 1;
        border-bottom: 0.075em solid;
        margin: auto;
    }

    &:before {
        margin-right: 0.75em;
    }

    &:after {
        margin-left: 0.75em;
    }
`;

const InfoRow = styled(Row)`
    margin-top: 1.5em;
`;

const InfoHeading = styled.h1`
    font-family: board, serif;
    font-size: 6vh;
    text-shadow: 0.1em 0.1em #000;
    letter-spacing: 0.02em;
`;

const SessionNameText = styled.h1`
    font-family: board, serif;
    font-size: 15vh;
    color: #d69f4c;
    text-shadow: 0.075em 0.075em #000;
`;

const StartGameInputGroup = styled(InputGroup)`
    position: absolute;
    bottom: 4%;
    left: 50%;
    -webkit-transform: translateX(-50%);
    transform: translateX(-50%);

    font-family: clue, serif;
    font-size: 3vh;
`;

const DecadeDropdown = styled(SplitButton)`
    padding-right: 1em;
`;

const StartGameButton = styled(Button)`
    font-family: clue, serif;
    font-size: 3vh;
`;

const LeaderboardButton = styled(Button)`
    font-family: clue, serif;
    font-size: 2vh;
    margin-left: 0.25em;
    margin-right: 0.25em;
    margin-bottom: 0.5em;
`;

const InfoList = styled.ul`
    padding-inline-start: 0;
    list-style-type: none;
`;

const LeaderboardPlayerNames = styled(Col)`
    text-align: right;
    white-space: nowrap;
    overflow: hidden;
`;

const LeaderboardScores = styled(Col)`
    text-align: left;
`;

const ActivePlayersText = styled.span`
    position: absolute;
    bottom: 0;
    right: 0;
    margin-right: 0.5em;

    font-family: clue, serif;
    font-size: 2vh;
    text-shadow: 0.1em 0.1em #000;
`;

const sortByJoinIndex = (players) => Object.values(players).sort((a, b) => a.joinIndex - b.joinIndex);

const BrowserLobby = () => {
    const debug = useContext(DebugContext);

    const [players, setPlayers] = useState(debug ? sortByJoinIndex(samplePlayers) : []);
    const [sessionName, setSessionName] = useState(debug ? 'TEST' : '');
    const [decade, setDecade] = useState(2000);
    const [categoriesLoaded, setCategoriesLoaded] = useState(false);
    const [leaderboards, setLeaderboards] = useState(debug ? { 'allTime': sampleLeaderboard, 'month': sampleLeaderboard, 'week': sampleLeaderboard } : {});
    const [displayLeaderboardName, setDisplayLeaderboardName] = useState('week');
    const [activePlayers, setActivePlayers] = useState(debug ? 1 : 0);
    const [mute, setMute] = useState(true);

    const [showPatchNotesPanel, setShowPatchNotesPanel] = useState(false);
    const [showEmailPanel, setShowEmailPanel] = useState(false);

    const socket = useContext(SocketContext);

    const lobbyMusicAudio = new Audio(lobbyMusicSound);

    useEffect(() => {
        socket.on('session_name', (sessionName) => {
            setSessionName(sessionName);
        });

        socket.on('active_players', (activePlayers) => {
            setActivePlayers(activePlayers);
        });

        socket.on('categories_loaded', (categoriesLoaded) => {
            setCategoriesLoaded(categoriesLoaded);
        });

        socket.on('leaderboards', (leaderboards) => {
            setLeaderboards(leaderboards);
        });

        socket.on('unmute', () => {
            lobbyMusicAudio.loop = true;
            lobbyMusicAudio.volume = 0.5;
            lobbyMusicAudio.play();

            const trebekIntroAudio = new Audio(trebekIntroSound);

            trebekIntroAudio.onended = () => {
                lobbyMusicAudio.volume = 1;
            };

            trebekIntroAudio.play();
        });

        socket.on('start_game_success', () => {
            lobbyMusicAudio.pause();
        });

        socket.on('start_game_failure', () => {
            alert(`There aren't any players in this session!`);
        });

        socket.on('players', (players) => {
            setPlayers(sortByJoinIndex(players));
        });

        return () => {
            socket.off('unmute');
            socket.off('start_game_success');
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleUnmute = useCallback(() => {
        setMute(false);
        socket.emit('unmute');

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDecadeDropdownSelect = useCallback((e) => {
        setDecade(e);
        setCategoriesLoaded(false);

        socket.emit('decade', e);

         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleStartGame = useCallback(() => {
        socket.emit('start_game');

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleInfo = useCallback(() => {
        alert(legalInfo);

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleEmail = useCallback((e) => {
        e.preventDefault();

        emailjs.sendForm(
            'service_ukf1tzq',
            'template_aewkijo',
            e.target,
            'user_Y0EyYUhU4F4OA6pWPcs4N'
        ).then((result) => {
            console.log(result.text);
        }, (error) => {
            console.log(error.text);
        });

        setShowEmailPanel(false);

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div>
            {(mute && !showPatchNotesPanel) &&
                <MuteScreen>
                    <MuteScreenText onClick={() => handleUnmute()}>
                        <MuteScreenButton variant={'outline-light'}>CLICK TO UNMUTE</MuteScreenButton>
                    </MuteScreenText>
                </MuteScreen>
            }

            {showEmailPanel &&
                <MuteScreen>
                    <EmailPanel>
                        <EmailPanelCancelButton onClick={() => setShowEmailPanel(false)}>
                            <ImCancelCircle size={'20px'} />
                        </EmailPanelCancelButton>

                        <Form onSubmit={handleEmail}>
                            <Form.Group className={'mb-3'} controlId={'exampleForm.ControlTextarea1'}>
                                <Form.Label>Message</Form.Label>
                                <Form.Control as={'textarea'} rows={8} name={'message'} placeholder={'Enter your questions, comments, concerns, or feedback...'} />
                            </Form.Group>

                            <Form.Group className={'mb-3'} controlId={'exampleForm.ControlInput1'}>
                                <Form.Label>Email address (optional)</Form.Label>
                                <Form.Control type={'email'} name={'emailAddress'} placeholder={`Only include if you'd like to hear back from me`} />
                            </Form.Group>

                            <Button variant={'outline-light'} type={'submit'}>
                                Submit
                            </Button>
                        </Form>
                    </EmailPanel>
                </MuteScreen>
            }

            {showPatchNotesPanel &&
                <MuteScreen>
                    <EmailPanel>
                        <EmailPanelCancelButton onClick={() => setShowPatchNotesPanel(false)}>
                            <ImCancelCircle size={'20px'} />
                        </EmailPanelCancelButton>

                        <PatchNotesPanel>
                            <h1>Update</h1>

                            <PatchNotesText>
                                Hey! Sorry the game has been down for a while! Jeoparty! was making way too many daily requests to the API I was relying on, so I finally added my own local database of clues. Jeoparty! no longer has any dependency on an external clue API... yay!
                                <br /><br />
                                I'm lazy (if you couldn't already tell) so I procrastinated this for several years. But here we are today. Everything should be back to normal. If you're someone who still cared 
                                to check this website and play a game even after months of inactivity... you're the real MVP!
                                <br /><br />
                                -Isaac<br/>
                                7/28/2023
                            </PatchNotesText>
                        </PatchNotesPanel>

                        <Button variant={'outline-light'} onClick={() => {
                            setShowPatchNotesPanel(false);
                            handleUnmute();
                        }}>
                            Close (and unmute)
                        </Button>
                    </EmailPanel>
                </MuteScreen>
            }

            <Container fluid>
                <LogoRow>
                    <Col lg={'12'}>
                        <LogoText>JEOPARTY!</LogoText>
                        <JoinText>JOIN ON YOUR PHONE AT JEOPARTY.IO</JoinText>
                    </Col>
                </LogoRow>

                <InfoRow>
                    <Col lg={'4'}>
                        <InfoHeading>PLAYERS</InfoHeading>
                        <InfoList>
                            {sortByJoinIndex(players).map((player) => {
                                return <li key={player.name}><InfoText><HypeText text={player.name.toUpperCase()} /></InfoText></li>
                            })}
                        </InfoList>
                    </Col>

                    <Col lg={'4'}>
                        <InfoHeading>SESSION NAME</InfoHeading>
                        <SessionNameText>{sessionName.toUpperCase()}</SessionNameText>
                    </Col>

                    <Col lg={'4'}>
                        <InfoHeading>LEADERBOARD</InfoHeading>
                        <LeaderboardButton onClick={() => setDisplayLeaderboardName('week')} variant={displayLeaderboardName === 'week' ? 'light' : 'outline-light'}>THIS WEEK</LeaderboardButton>
                        <LeaderboardButton onClick={() => setDisplayLeaderboardName('month')} variant={displayLeaderboardName === 'month' ? 'light' : 'outline-light'}>THIS MONTH</LeaderboardButton>
                        <LeaderboardButton onClick={() => setDisplayLeaderboardName('allTime')} variant={displayLeaderboardName === 'allTime' ? 'light' : 'outline-light'}>ALL TIME</LeaderboardButton>
                        <Row>
                            <LeaderboardPlayerNames lg={'6'}>
                                <InfoList>
                                    {_.get(leaderboards, `[${displayLeaderboardName}]`, []).map((leader) => {
                                        return (
                                            <li key={`${displayLeaderboardName}${leader.position}${leader.name}`}>
                                                <LeaderboardText>
                                                    {leader.position === 0 ? <HypeText text={leader.name.toUpperCase()} rainbow={true} /> : leader.name.toUpperCase()}
                                                </LeaderboardText>
                                            </li>
                                        )
                                    })}
                                </InfoList>
                            </LeaderboardPlayerNames>

                            <LeaderboardScores lg={'6'}>
                                <InfoList>
                                    {_.get(leaderboards, `[${displayLeaderboardName}]`, []).map((leader) => {
                                        return (
                                            <li key={`${displayLeaderboardName}${leader.position}${leader.score}`}>
                                                <LeaderboardText>
                                                    {leader.position === 0 ? <HypeText text={'$' + leader.score} rainbow={true} /> : '$' + leader.score}
                                                </LeaderboardText>
                                            </li>
                                        );
                                    })}
                                </InfoList>
                            </LeaderboardScores>
                        </Row>
                    </Col>
                </InfoRow>

                <StartGameInputGroup className={'mb-3 justify-content-center'}>
                    {
                        categoriesLoaded && (
                            <DecadeDropdown
                                id={`dropdown-split-variants-outline-light`}
                                variant={'outline-light'}
                                title={`CLUE DECADES: ${decade}+`}
                                onSelect={handleDecadeDropdownSelect}
                                value={decade}
                            >
                                <Dropdown.Item eventKey={2000} value={2000} active={decade === 2000}>2000+</Dropdown.Item>
                                <Dropdown.Item eventKey={2010} value={2010} active={decade === 2010}>2010+</Dropdown.Item>
                            </DecadeDropdown>
                        )
                    }
                    

                    {
                        !mute && (
                            categoriesLoaded ? <StartGameButton onClick={() => handleStartGame()} variant={'outline-light'}>START GAME</StartGameButton>
                                             : <StartGameButton variant={'outline-light'} disabled={true}>CATEGORIES LOADING...</StartGameButton>
                        )
                    }
                </StartGameInputGroup>

                <ButtonWrapper>
                    <span onClick={() => setShowEmailPanel(true)}>
                        <AiOutlineMail size={'50px'} />
                    </span>

                    <InfoButtonWrapper onClick={() => handleInfo()}>
                        <AiOutlineInfoCircle size={'40px'} />
                    </InfoButtonWrapper>
                </ButtonWrapper>

                <ActivePlayersText>
                   {activePlayers} active game{activePlayers === 1 ? '' : 's'}
                </ActivePlayersText>
            </Container>
        </div>
    );
};

export default BrowserLobby;
