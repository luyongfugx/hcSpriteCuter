
var fs = require('fs'),PNG = require('pngjs').PNG;
var pngFile=process.argv[2];
var outDir=pngFile.replace(".png","");
fs.createReadStream(pngFile)
    .pipe(new PNG({
        filterType: 4
    }))
    .on('parsed', function() {
        var tempData= new Buffer(4*this.width*this.height);
        this.data.copy(tempData);
        if(!fs.existsSync('export')){
            fs.mkdirSync('export');
        }
        if(!fs.existsSync('export/'+outDir)){
            fs.mkdirSync('export/'+outDir);
        }
        var spritesArray=getSprites(tempData,this.height,this.width);
        var css=getCss(spritesArray,pngFile);
        fs.writeFile(outDir+'.css', css, function (err) {
            if (err) throw err;
            console.log('It\'s saved!');
        });
        for(var i=0;i<spritesArray.length;i++){
            var rect=spritesArray[i];
            console.log(rect);
            var newData={data:null,height:(rect.rb.y-rect.rt.y),width:(rect.rt.x-rect.lt.x)} ;
            var newPng=new PNG({
                filterType: 4,
                width:newData.width,
                height:newData.height
            });
            this.bitblt(newPng, rect.lt.x, rect.lt.y, newData.width, newData.height,0, 0);


            var dst = fs.createWriteStream('export/'+outDir+'/'+outDir+''+i+'.png');
            newPng.pack().pipe(dst);
        }
    }
);
function getCss(spritesArray,pngname){
    var css='.sprite {display:inline-block; overflow:hidden; background-repeat: no-repeat;background-image:url('+pngname+');}' ;
    for(var i=0;i<spritesArray.length;i++){
        var rect=spritesArray[i];
        css=css+getSpriteCss('sprite'+i,rect);
    }
    return css;
}
function getSpriteCss(spritename,rect){
    var  css='.'+spritename+' {width:'+(rect.rt.x-rect.lt.x)+'px; height:'+(rect.rb.y-rect.rt.y)+'px; background-position: '+(0-rect.lt.x)+'px '+(0-rect.lt.y)+'px}';
    return css;
}
function getSprites(data,height,width){
    var spritesArray=new Array();
    var contourVector=marchingSquares(data,height,width);
    var i=0;

    while(contourVector.length>3){
       console.log('enter while :'+i+"  "+contourVector.length);
        var rect=getRect(contourVector);
        if((rect.rt.x-rect.lt.x>3)&&(rect.lb.y-rect.lt.y>3)){
            spritesArray.push(rect);
        }

        for (var y = rect.rt.y; y < rect.rb.y; y++) {
            for (var x = rect.lb.x; x < rect.rb.x; x++) {
                var idx = (width * y + x) << 2;
                data[idx] =0;
                data[idx+1] =0;
                data[idx+2] =0;
                data[idx+3]= 0;
            }

        }
        contourVector=marchingSquares(data,height,width);
    }
    return spritesArray;

}

//获取一个图片的4个边界点
function getRect(squreArray){
    var rectXY={};
    rectXY.maxX=squreArray[0].x;
    rectXY.minX=squreArray[0].x;
    rectXY.maxY=squreArray[0].y;
    rectXY.minY=squreArray[0].y;
    for(var i=0;i<squreArray.length;i++){
         var p=squreArray[i];
        rectXY.maxX= p.x>rectXY.maxX? p.x:rectXY.maxX;
        rectXY.maxY= p.y>rectXY.maxY? p.y:rectXY.maxY;
        rectXY.minX= p.x<rectXY.minX? p.x:rectXY.minX;
        rectXY.minY= p.y<rectXY.minY? p.y:rectXY.minY;
    }
    return {
        lt:{x:rectXY.minX,y:rectXY.minY},
        lb:{x:rectXY.minX,y:rectXY.maxY},
        rt:{x:rectXY.maxX,y:rectXY.minY},
        rb:{x:rectXY.maxX,y:rectXY.maxY}
    }

}

function marchingSquares(data,height,width) {
    var contourVector= new Array();

// 获取起始像素
var startPoint=getStartingPixel(data,height,width);
// 找到起始像素后我们就可以开始了

if (startPoint!=null&&startPoint.x>=0) {

// pX 跟 pY是起始点的x,y坐标
    var pX=startPoint.x;
    var pY=startPoint.y;
// stepX 和 stepY 可能是 -1, 0 或 1  代表到轮廓下一个点的查找像素步骤
    var stepX=0;
    var stepY=0;
// 下面两个变量保存上一步步骤
    var prevX=0;
    var prevY=0;
// 追踪整个轮廓时，closedLoop将成为true
    var closedLoop=false;
    var ix=0;
    while (!closedLoop) {
// 这段主要是获取每个像素的2x2矩阵

        var squareValue=getSquareValue(data,pX,pY,width);
       // console.log(squareValue);
        switch (squareValue) {
            /* 往上用这些事例:
             +---+---+ +---+---+ +---+---+
             | 1 | | | 1 | | | 1 | |
             +---+---+ +---+---+ +---+---+
             | | | | 4 | | | 4 | 8 |
             +---+---+ +---+---+ +---+---+
             */
            case 1 :
            case 5 :
            case 13 :
                stepX=0;
                stepY=-1;
                break;
            /* 往下用这些事例
             +---+---+ +---+---+ +---+---+
             | | | | | 2 | | 1 | 2 |
             +---+---+ +---+---+ +---+---+
             | | 8 | | | 8 | | | 8 |
             +---+---+ +---+---+ +---+---+
             */
            case 8 :
            case 10 :
            case 11 :
                stepX=0;
                stepY=1;
                break;
            /* 往左用这些事例
             +---+---+ +---+---+ +---+---+
             | | | | | | | | 2 |
             +---+---+ +---+---+ +---+---+
             | 4 | | | 4 | 8 | | 4 | 8 |
             +---+---+ +---+---+ +---+---+
             */
            case 4 :
            case 12 :
            case 14 :
                stepX=-1;
                stepY=0;
                break;
            /* 往右用这些事例
             +---+---+ +---+---+ +---+---+
             | | 2 | | 1 | 2 | | 1 | 2 |
             +---+---+ +---+---+ +---+---+
             | | | | | | | 4 | |
             +---+---+ +---+---+ +---+---+
             */
            case 2 :
            case 3 :
            case 7 :
                stepX=1;
                stepY=0;
                break;
            case 6 :
                /* 特殊鞍点用case 1:
                 +---+---+
                 | | 2 |
                 +---+---+
                 | 4 | |
                 +---+---+
                 如果来自上面，那就往左，否则往右
                 */
                if (prevX==0&&prevY==-1) {
                    stepX=-1;
                    stepY=0;
                }
                else {
                    stepX=1;
                    stepY=0;
                }
                break;
            case 9 :
                /* 特殊鞍点 case 2:
                 +---+---+
                 | 1 | |
                 +---+---+
                 | | 8 |
                 +---+---+
                 如果来自右边，就往上，否则往下
                 */
                if (prevX==1&&prevY==0) {
                    stepX=0;
                    stepY=-1;
                }
                else {
                    stepX=0;
                    stepY=1;
                }
                break;
        }
// 移到下一个点
        pX+=stepX;
        pY+=stepY;
        //console.log(pX+" "+pY);

// 保存轮廓点
        contourVector.push(new Point(pX, pY));
        prevX=stepX;
        prevY=stepY;
        ix++;
//如果返回到第一个访问的点，循环结束
        if (pX==startPoint.x&&pY==startPoint.y) {
            closedLoop=true;
        }
        if(ix>200000){
            break;
        }
    }
}
return contourVector;
}



function getSquareValue(data,pX,pY,width){

    /*
     检测2x2像素网格，如果不是透明就给每个像素赋值
     +---+---+
     | 1 | 2 |
     +---+---+
     | 4 | 8 | <- 当前像素 (pX,pY)
     +---+---+
     */
    var squareValue=0;
    if(!isAlpha(data,pX-1,pY-1,width)){
        squareValue+=1;
    }

    if(!isAlpha(data,pX,pY-1,width)){
        squareValue+=2;
    }

    if(!isAlpha(data,pX-1,pY,width)){
        squareValue+=4;
    }

    if(!isAlpha(data,pX,pY,width)){
        squareValue+=8;
    }
    return squareValue;
}

//扫描图像像素来蛮力找到非透明的像素作为起始像素
function getStartingPixel(data,height,width){
    var offsetPoint=new Point(-1,-1);
    for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
            offsetPoint.x=x;
            offsetPoint.y=y;
            var idx = (width * y + x) << 2;
            var alpha=data[idx+3];
            if(alpha>0){
                console.log("offPoint :"+offsetPoint.x+' '+offsetPoint.y);
                return offsetPoint;
            }
        }
    }
    return offsetPoint;
}
//是不是透明
function isAlpha(data,x,y,width) {
   if(x<0||y<0){
       return true;
   }
    var idx = (width * y + x) << 2;
    var alpha=data[idx+3];
    if(alpha==0)
        return true;
    else
        return false;
}

var Point=function(_x,_y){
    this.x=_x;
    this.y=_y;
}