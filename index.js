var io = require('socket.io', {
        transports: ['websocket']
    })(http);


var ws_s = require('websocket').server;
var http = require('http');
var fs   = require('fs');

var log       = console.log;
var index_htm = fs.readFileSync('index.htm');
var server    = http.createServer(function(request, response){ response.writeHead(200, {'Content-Type': 'html'}); response.end(index); log('sent HTML/js'); });
var PORT=8000;  server.listen(PORT, function(){ log(t_stamp()+'listening on '+PORT); });

var count = 0;
var player_roster={
  id:'player_roster',
  count:0,
  ids:[-1,-1,-1,-1,-1,-1,-1],
  attn:[0,0,0,0,0,0,0]
}
var p=player_roster; //nickname

var clients = {};
var log_columns=50;
wsServer=new ws_s({ httpServer:server });
wsServer.on('request',function(r){
  
  // onconnection code begin
  var connection=r.accept('echo-protocol',r.origin);  
  var id=count++; 
  var hi_obj={id:id,time:t_stamp(),msg:"hi"};
  clients[id]=connection; 
  clients[id].birth=t_stamp();
  clients[id].sendUTF(JSON.stringify(hi_obj));
  log(clients[id].birth+'howdy #'+id);
  send_player_roster();
  // onconnection code end  
    
    
  
  // onmessage code begin
  connection.on('message',function(m_data){   // Create event listener
    //do stuff with incoming messages !!
    var msg = m_data.utf8Data;
    var msg_obj={id:id,time:t_stamp(),msg:msg};
    log(msg_obj.time+'#'+id+' says:'+msg.substr(0,log_columns)+(msg.length>log_columns?'...':''));
    for(var i in clients){
      msg_obj.client_id=i;
      clients[i].sendUTF(JSON.stringify(msg_obj));
    }
  });
  // onmessage code end

  
  
  // onclose code begin
  connection.on('close',function(reasonCode,description){ 
    //unspawn from player_roster and send everyone an update :)
    delete clients[id]; 
    log(t_stamp()+'ciao #'+id+' | ip:'+connection.remoteAddress);
    player_gone=player_roster.ids.indexOf(id);
    if(player_gone!=-1){
      log('so, #'+id+' was also player $'+(player_gone+1));
      p_count=0;
      for(var i=0; i<player_roster.ids.length; i++){
        log('    $'+(i+1)+' : '+(player_gone==i?'-1***':player_roster.ids[i]));
        if(player_roster.ids[i]!=-1) p_count++;
      }
      player_roster.ids[player_gone]=-1;
      player_roster.count=--p_count;
      send_player_roster();
      log(JSON.stringify(player_roster)+'\n'); 

    }
  });
  // onclose code end
  
});


function send_player_roster(){
  player_roster.t_stamp=t_stamp();
  for(var i in clients){
    clients[i].sendUTF(JSON.stringify(player_roster));
  }
}


function t_stamp(){ 
  now=new Date(); 
  now=
    (now.getHours()%12)+":"+
    (now.getMinutes()<10?'0':'')+now.getMinutes()+":"+
    (now.getSeconds()<10?'0':'')+now.getSeconds()+
    (now.getHours()<12?'a':'p')+'> ';
  return now; 
}


function fill(un){
  if(un==-1){
    player_roster.ids=[-1,-1,-1,-1,-1,-1,-1];
    player_roster.count=0;
  }
  else{
    for(var i=0; i<player_roster.ids.length; i++) if(player_roster.ids[i]==-1) player_roster.ids[i]=999999;
    player_roster.count=7;
  }    
  send_player_roster();
}

//process.stdin.pipe(log);

var NONE=0;
var SPAWN=1;
var UNSPAWN=-1;
var mode=NONE;
var spawn_id;

process.stdin.on('readable', function() {
  var command = process.stdin.read();
  if (command == null) return;
  c=command+'';
  if (c.substr(-1)=='\n') c=c.substr(0,c.length-1);
  
  switch(mode){
    case NONE:
      if(c=='p.d') eval("try{ log(player_roster) }catch(e){log(e)}"); 
      else if(c=='c.d') eval("try{ for(var i in clients) log( '#'+i ) }catch(e){log(e)}"); 
      else if(c=='clear') process.stdout.write('\033c');
      else if(c=='spawn'){
        mode=SPAWN; q=0;
        for(var i in clients){ 
          q++; 
          p_n=player_roster.ids.indexOf(i*1);
          if(p_n!=-1)
               log("  born:"+clients[i].birth+"| >id: #"+i+' is player $'+(p_n+1)+'<'); 
          else log("  born:"+clients[i].birth+"| id: #"+i); 
        }
        if(!q) log('  no one to play with :/');
        else log('  id (#x)> ');
      }
      else if(c=='unspawn'){
        mode=UNSPAWN;
        for(var i=0; i<player_roster.ids.length; i++){
          log('    $'+(i+1)+' : '+player_roster.ids[i]);
        }
        log('  player_number ($x)> ');
      }
      else if(c=='send') send_player_roster();
      else if(c[0]==">"){ log("try{"+c.substr(1)+"}catch(e){log(e)}"); log(eval("try{"+c.substr(1)+"}catch(e){log(e)}")); }
      else if(c[0]=="?") eval("try{ log("+c.substr(1)+") }catch(e){log(e)}");
      else log(help_);
    break;
      
    case SPAWN:
      if(c=='sudo fill') fill();
      if(c[0]=='#'){
        if(!isNaN(c.substr(1))){ 
          spawn_id=c.substr(1)*1; 
          log('\n  about to spawn id #'+spawn_id);
          for(var i=0; i<player_roster.ids.length; i++) log('    $'+(i+1)+' : '+(player_roster.ids[i]!=-1?'#':'')+player_roster.ids[i]);
          log('  player_number ($x)> ');
        }
      }
      else if(c[0]=='$' && spawn_id!=undefined){
        if(!isNaN(c.substr(1))){ 
          play_n=c.substr(1); 
          player_roster.ids[play_n-1]=spawn_id;
          log('\n  k. sent a message to everyone that id #'+spawn_id+' spawned as player $'+play_n);
          log('  good luck player $'+play_n+'! (id #'+spawn_id+')\n  may all beings be benefited by your quest\n');
          p_count=0;
          for(var i=0; i<player_roster.ids.length; i++){
            log('    $'+(i+1)+' : '+player_roster.ids[i]+(play_n==i+1?'***':''));
            if(player_roster.ids[i]!=-1) p_count++;
          }
          player_roster.count=p_count;
          log(JSON.stringify(player_roster)+'\n'); 
          send_player_roster();
          spawn_id=undefined
          mode=NONE;
        }
      }
      else{ log('mode=NONE'); spawn_id=undefined; mode=NONE; }
    break;
      
    case UNSPAWN:
      if(c=='sudo fill') fill(-1);
      if(c[0]=='$'){
        if(!isNaN(c.substr(1))){ 
          player_gone=c.substr(1); 
          
          player_roster.ids[player_gone-1]=-1;
          player_roster.count=--p_count;
          send_player_roster();
          log(JSON.stringify(player_roster)+'\n'); 
          
          log('\n  told everyone player $'+player_gone+' unspawned');
          log('  farewell player formerly known as $'+player_gone+'\n');
          
          mode=NONE;
        }
      }
      else{ log('mode=NONE'); mode=NONE; }
    break;
      
  }
});

process.stdin.on('end', function() {});

var help_=`
options:
  p.d                 player_roster.dump : log an unordered JSON.stringify of the player_roster
  c.d                 clients_array.dump : log an unordered JSON.stringify of the clients array
  spawn               
    id
    player_number
  attn
    player_number
    quantity
  unspawn
    player_number
  send                send_player_roster()
  ?                   log(command)
  >                   eval(command)
  clear
`;
  
/*var wstr = fs.createWriteStream('out.txt');*/