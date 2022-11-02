
//import { Spinner } from 'ittai/components';
import { React } from '../../../webpack/common';
const Component = React.Component;

import { findByProps } from '../../../webpack';
import { TextInput } from '../../../webpack/common';
import { addReview, getReviews } from '../Utils/ReviewDBAPI';
import ReviewComponent from "./ReviewComponent";
const { eyebrow } = findByProps("eyebrow");
const { bodyTitle } = findByProps("bodyTitle");
const { section } = findByProps("section", "lastSection");
const { defaultColor } = findByProps("defaultColor");

interface IState {
    reviews?: any[];
}

export const Queue = {
    last: Promise.resolve(),
    push(func: any) {
        return (this.last = this.last.then(func));
    }
};

export default class ReviewsView extends Component<any, IState> {
    constructor(props: any) {
        super(props);
        this.state = {
            reviews: undefined
        };
    }

    fetchReviews = () => {
        getReviews(this.props.userid).then(reviews => {
            this.setState({ reviews: reviews });
        });
    };

    componentDidMount(): void {
        const reviews = this.state.reviews;
        if (reviews === undefined) {
            this.fetchReviews();
        }
    }

    onKeyPress(keyEvent: any) {
        if (keyEvent.key === "Enter") {
            addReview({
                "userid": this.props.userid,
                "comment": keyEvent.target.value,
                "star": -1
            }).then(response => {
                if (response === 0 || response === 1) {
                    keyEvent.target.value = ""; // clear the input
                    this.fetchReviews();
                }
            });
        }
    }

    render() {
        const reviews = this.state.reviews;
        return (
            <div >
                <h3 className={eyebrow + " " + bodyTitle + " " + section} style={{ color: "var(--header-secondary)" }}>User Reviews</h3>
                {
                    (reviews) ? (reviews.map(review => {
                        return <ReviewComponent fetchReviews={this.fetchReviews} review={review} />;
                    })) : (<div><br></br></div>)
                }
                {(reviews?.length === 0) ? (
                    <h2 className={defaultColor + " " + section} style={{ fontSize: 16, fontStyle: 'italic', fontWeight: 'bold', marginBottom: 16 }}>Looks like nobody reviewed this user, you can be first</h2>
                ) : <></>}

                <TextInput placeholder='Enter a comment' onKeyPress={(e) => this.onKeyPress(e)}></TextInput>
            </div>
        );
    }

}
