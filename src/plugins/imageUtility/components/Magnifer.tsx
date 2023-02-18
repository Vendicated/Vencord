/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { LazyComponent } from "@utils/misc";
import { React } from "@webpack/common";

import { waitFor } from "../utils/waitFor";

interface MagniferProps {
    zoom: number;
    size: number,
    instance: any;
}

// class component because i like it more
export const Magnifer = LazyComponent(() => class Magnifer extends React.PureComponent<MagniferProps> {
    lens = React.createRef<HTMLDivElement>();
    imageRef = React.createRef<HTMLImageElement>();
    currentVideoElementRef = React.createRef<HTMLVideoElement>();
    element!: HTMLDivElement;
    videoElement!: HTMLVideoElement;
    constructor(props: MagniferProps) {
        super(props);
        this.element = document.querySelector("#bruhjuhhh")!;
    }


    async componentDidMount() {
        document.addEventListener("mousemove", this.updateMousePosition);

        if (this.props.instance.props.animated) {
            await waitFor("#bruhjuhhh > video");
            this.videoElement = this.element.querySelector("video")!;
            this.videoElement.addEventListener("timeupdate", this.syncVidoes.bind(this));
            this.setState({ ...this.state, ready: true });
        } else {
            this.setState({ ...this.state, ready: true });
        }
    }

    componentWillUnmount(): void {
        document.removeEventListener("mousemove", this.updateMousePosition);
        this.videoElement?.removeEventListener("timeupdate", this.syncVidoes.bind(this));

    }

    syncVidoes(e: Event) {
        this.currentVideoElementRef.current!.currentTime = this.videoElement.currentTime;
    }

    updateMousePosition = (e: MouseEvent) => {
        const { instance, zoom, size } = this.props;
        if (instance.state.mouseOver && instance.state.mouseDown) {
            const offset = size / 2;
            this.setLensPosition({ x: e.x - offset, y: e.y - offset });
            const pos = { x: e.pageX, y: e.pageY };
            const x = -((pos.x - this.element.getBoundingClientRect().left) * zoom - offset);
            const y = -((pos.y - this.element.getBoundingClientRect().top) * zoom - offset);
            this.setImagePosition({ x, y });
        }
        else this.setState({ ...this.state, opacity: 0 });
    };

    setImagePosition = (imagePosition: { x: number; y: number; }) => {
        this.setState({ ...this.state, imagePosition });
    };

    setLensPosition = (position: { x: number; y: number; }) => {
        this.setState({ ...this.state, opacity: 1, position: position });
    };

    state = {
        position: { x: 0, y: 0 },
        imagePosition: { x: 0, y: 0 },
        opacity: 0,
        ready: false
    };

    render() {
        if (!this.state.ready) return null;
        const { size, zoom, instance: { props: { height: imageHeight, width: imageWidth, src, animated } } } = this.props;
        const { position, opacity, imagePosition } = this.state;
        const transformStyle = `translate(${position.x}px, ${position.y}px)`;
        const box = document.querySelector("#bruhjuhhh")!.getBoundingClientRect();

        return (

            <div
                className="lens"
                style={{
                    opacity,
                    width: size + "px",
                    height: size + "px",
                    transform: transformStyle,
                }}
            >
                {animated ?
                    <video
                        className="embedVideo-2ixt5A embedMedia-1mdWSP"
                        ref={this.currentVideoElementRef}
                        style={{
                            position: "absolute",
                            left: `${imagePosition.x}px`,
                            top: `${imagePosition.y}px`
                        }}
                        width={`${box.width * zoom}px`}
                        height={`${box.height * zoom}px`}
                        poster={src}
                        src={this.videoElement.src ?? src}
                        autoPlay
                        loop
                    /> : <img
                        ref={this.imageRef}
                        style={{
                            position: "absolute",
                            left: `${imagePosition.x}px`,
                            top: `${imagePosition.y}px`
                        }}
                        width={`${box.width * zoom}px`}
                        height={`${box.height * zoom}px`}
                        src={src} alt=""
                    />}
            </div>
        );
    }
});

