import 'whatwg-fetch';

class User extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            fullname : props.fullname,
            liked: (props.liked) ? props.liked : 0
        }
    }

    onLikedUser() {
        this.setState({
            liked : this.state.liked + 1
        });
    }

    render() {
        return(
            <a href="javascript:" onClick={ this.onLikedUser.bind(this) }>
                <div>Fullname: {this.state.fullname}, liked: {this.state.liked}</div>
            </a>
        )
    }
}

class ShoppingList extends React.Component {
    render() {
        return (
        <div className="shopping-list">
            <h1>Shopping List for {this.props.name}</h1>
            <ul>
                <User fullname="Viet" />
                <User fullname="Vu" />
                <User fullname="Vi" />
            </ul>
        </div>
        );
    }
}

ReactDOM.render(<ShoppingList name="Viet" />, document.getElementById("App"));