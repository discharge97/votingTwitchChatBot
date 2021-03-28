import { Component } from '@angular/core';
import { Socket } from 'ngx-socket-io';

class VoteOption {
  name: string;
  count: number = 0;
  constructor(name: string, count: number = 0) {
    this.name = name;
    this.count = count;
  }
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  winningVote: string = "";
  messageInfo: string = "";
  intEnd;
  intEndWinVote;
  hide: boolean = true;
  constructor(private socket: Socket, ) {
    socket.on("vote", vote => {
      if (vote) {
        this.hide = false;
        this.votes = vote;
      }
    });

    socket.on("cancel", () => {
      this.cancelVote(false);
    });

    socket.on("end", () => {
      this.endVoting(false);
    });



    if (window.location.href.indexOf("votes") >= 0) {
      this.isSetup = false;
    }
  }
  title = 'voting-system';
  votes;
  isSetup = true;

  addVoteOpt(voteOpt) {
    if (!this.votes) {
      this.votes = { title: "", color: "", options: [] };
    }

    if (voteOpt.value.trimLeft() !== "") {
      this.votes.options.push(new VoteOption(voteOpt.value.trimLeft()));
      voteOpt.value = "";
    }
  }

  removeVoteOpt(index) {
    this.votes.options.splice(index, 1);
  }

  startVoting(title, minutes, color) {
    if (!title || title === '') {
      this.messageInfo = "All the fields are required!"
    }
    this.votes.title = title;
    this.votes.color = color;
    this.socket.emit("start", this.votes);
    this.intEnd = setTimeout(() => {
      this.endVoting();
    }, minutes * 60000);
  }

  endVoting(emmit = true) {
    if (emmit) {
      this.socket.emit("end", undefined);
    }

    let tmp = -1;
    let multi = [];

    if (this.votes && this.votes.options) {

      for (let i = 0; i < this.votes.options.length; i++) {
        if (this.votes.options[i].count > tmp) {
          tmp = this.votes.options[i].count;
        }
      }

      this.votes.options.forEach(vote => {
        if (vote.count == tmp) {
          multi.push(vote.name);
        }
      });

    } else {
      return;
    }

    this.hide = true;

    setTimeout(() => {
      this.winningVote = `'${multi.join(",")}' won with ${tmp} votes!`;
    }, 1000);

    this.intEndWinVote = setTimeout(() => {
      this.votes = undefined;
      this.winningVote = "";
    }, 30000);
  }

  cancelVote(emmit = true) {
    if (emmit) {
      this.socket.emit("cancel", undefined);
    }
    clearInterval(this.intEndWinVote);
    clearInterval(this.intEnd);
    this.votes = undefined;
  }

  getPercent(index): number {
    if (!this.votes.options || this.votes.options.length == 0) return 0;
    let tmp = 0;
    this.votes.options.forEach(opt => {
      tmp += opt.count;
    });

    if (tmp == 0) return 0;

    return (this.votes.options[index].count * 100) / tmp;
  }

  getWidth(percent) {
    return (485 * (percent / 100)).toFixed(2);
  }


}
