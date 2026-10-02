// Copyright Inigo Quilez, 2013 - https://iquilezles.org/
// I am the sole copyright owner of this Work.
// You cannot host, display, distribute or share this Work neither as it is
// or altered, here on Shadertoy or anywhere else, in any form including
// physical and digital. You cannot use this Work in any commercial or
// non-commercial product, website or project. You cannot sell this Work
// and you cannot mint an NFTs of it or train a neural network with it
// without permission. I share this Work for educational purposes, and you
// can link to it, through an URL, proper attribution and unmodified 
// screenshot, as part of your educational material. If these conditions
// are too restrictive please contact me and we'll definitely work it out.

float hash( float n )
{
    return fract(sin(n)*158.5453);
}

float noise( in float x )
{
    float i = floor(x);
    float f = fract(x);
    f = f*f*(3.0-2.0*f);
    return mix( hash(i+0.0), hash(i+1.0),f);
}

float noise( in vec2 x )
{
    vec2 i = floor(x);
    vec2 f = fract(x);
    f = f*f*(3.0-2.0*f);
    float a = textureLod(iChannel1,(i+vec2(0.5,0.5))/64.0, 0.0).x;
	float b = textureLod(iChannel1,(i+vec2(1.5,0.5))/64.0, 0.0).x;
	float c = textureLod(iChannel1,(i+vec2(0.5,1.5))/64.0, 0.0).x;
	float d = textureLod(iChannel1,(i+vec2(1.5,1.5))/64.0, 0.0).x;
    return 2.0*mix(mix(a,b,f.x), mix(c,d,f.x),f.y);
}

float fbmcheap( in vec3 x )
{
    float f = 0.0;
    float s = 0.5;
    for( int i=0; i<6; i++ )
    {
        f += s*texture(iChannel3,x).x;
        x *= 1.93;
        s *= 0.51;
    }
    return f;
}

// https://iquilezles.org/articles/noacos/
/*
mat3x3 rotationAlign( vec3 d, vec3 z )
{
    vec3  v = cross( z, d );
    float c = dot( z, d );
    float k = 1.0/(1.0+c);
    return mat3x3( v.x*v.x*k + c,     v.y*v.x*k - v.z,    v.z*v.x*k + v.y,
                   v.x*v.y*k + v.z,   v.y*v.y*k + c,      v.z*v.y*k - v.x,
                   v.x*v.z*k - v.y,   v.y*v.z*k + v.x,    v.z*v.z*k + c    );
}
*/
// same as above, specialized for z=(0,0,1)
mat3x3 rotationAlign( vec3 d )
{
    float k = 1.0/(1.0+d.z);
    return mat3x3(  d.y*d.y*k + d.z, -d.x*d.y*k,       d.x,
                   -d.y*d.x*k,        d.x*d.x*k + d.z, d.y,
                   -d.x,             -d.y,             d.z );
}

// https://iquilezles.org/articles/distfunctions/
vec2 sdSegmentH( float le, vec3 p )
{
	float h = clamp( p.x/le, 0.0, 1.0 );
    p.x -= le*h;
	return vec2( length(p), h );
}

// https://www.shadertoy.com/view/tdS3DG
float sdEllipsoid( in vec3 p, in vec3 r )
{
    float k0 = length(p/r);
    float k1 = length(p/(r*r));
    return k0*(k0-1.0)/k1;
}

// https://iquilezles.org/articles/smin
float smin( float a, float b, float k )
{
    float h = max(k-abs(a-b),0.0);
    return min(a, b) - h*h*0.25/k;
}

// https://iquilezles.org/articles/smin
float smax( float a, float b, float k )
{
    k *= 1.4;
    float h = max(k-abs(a-b),0.0);
    return max(a, b) + h*h*h/(6.0*k*k);
}

// https://iquilezles.org/articles/filteringrm/
void calcDpDxy( in vec3 ro, in vec3 rd, in vec3 rdx, in vec3 rdy, in float t, in vec3 nor, out vec3 dpdx, out vec3 dpdy )
{
    dpdx = t*(rdx*dot(rd,nor)/dot(rdx,nor) - rd);
    dpdy = t*(rdy*dot(rd,nor)/dot(rdy,nor) - rd);
}

// https://iquilezles.org/articles/simpleik/
vec3 solve( vec3 p, float r1, float r2, vec3 dir )
{
	vec3 q = p*( 0.5 + 0.5*(r1*r1-r2*r2)/dot(p,p) );
	
	float s = r1*r1 - dot(q,q);
	s = max( s, 0.0 );
	q += sqrt(s)*normalize(cross(p,dir));
	
	return q;
}

vec3 solve( vec3 a, vec3 b, float l1, float l2, vec3 dir )
{
	return a + solve( b-a, l1, l2, dir );
}

#define ZERO (min(iFrame,0))

//----------------------------------------------------------------

float terrainBase( vec2 x )
{
	x += 100.0;
	x *= 0.6;

	vec2 p = floor(x);
    vec2 f = fract(x);
    f = f*f*(3.0-2.0*f);
    float a = textureLod(iChannel0,(p+vec2(0.5,0.5))/1024.0,0.0).x;
	float b = textureLod(iChannel0,(p+vec2(1.5,0.5))/1024.0,0.0).x;
	float c = textureLod(iChannel0,(p+vec2(0.5,1.5))/1024.0,0.0).x;
	float d = textureLod(iChannel0,(p+vec2(1.5,1.5))/1024.0,0.0).x;
	float r = mix(mix( a, b,f.x), mix( c, d,f.x), f.y);
	
	return 12.0*r;
}

float terrain( vec2 x )
{
	float f = terrainBase( x );
	float h = smoothstep( 0.4, 0.8, noise( 2.0*x ) );
	f -= 0.2*h;
	return f;
}

float terrainD( vec2 x )
{
	float f = terrainBase( x );
	float h = smoothstep( 0.4, 0.8, noise( 2.0*x ) );
	f -= 0.2*h;

    float d = noise( 35.0*x.yx*vec2(0.1,1.0) );
	f += 0.003*d * h*h;
    f += 0.01*texture(iChannel0,0.5*x).x;

	return f;
}

struct Monster
{
	vec3 center;
	vec3 mww;
	vec3 ne[6];
	vec3 f0b[6];
}monster;

vec2 sdMonster( in vec3 p )
{
	vec3 q = p - monster.center;
	
	if( dot(q,q)>25.0 ) return vec2(32.0);
	
	vec3 muu = vec3(1.0,0.0,0.0);
	vec3 mvv = normalize( cross(monster.mww,muu) );
	q = vec3( q.x, dot(mvv,q), dot(monster.mww,q) );

    vec3 ref = q;
    
    // body
	float f = 0.5 - 0.5*q.z;
    float g = smoothstep(-0.2,0.2,q.y);
	float ab = (0.5 + g*0.5*cos( 1.0 + 40.0*pow(0.5-0.5*q.z,2.0) ))*(1.0-f);
    float d1 = sdEllipsoid( q, vec3(0.65,0.45,1.0)*(1.0+0.3*ab) );
	float ho = 1.0-clamp( 3.0*abs(q.x), 0.0, 1.0 );
	d1 += 0.1*(1.0-sqrt(1.0-ho*ho))*smoothstep( 0.0,0.1,-q.z );

	float eye = length( vec3(abs(q.x),q.yz) - vec3(0.3,0.05,0.9) ) - 0.3; 
	d1 = smax(d1,-eye,0.05);

	float b = 1.0 + 5.0*sqrt(clamp(f,0.0,1.0))*g;
    
	// Novel optimization: legs only matter when close to body.
	// If body distance is large, legs won't blend in via smin,
	// so skip the expensive 6-leg loop entirely.
	if( d1 > 2.0 )
	{
	    d1 -= (1.0+b)*0.02*(textureLod(iChannel2,1.5*ref.xz,0.0).x-0.15);
	    vec2 res = vec2( 0.5*d1, 1.0 );
	    if( eye<res.x ) res = vec2( eye, 0.0 );
	    return res;
	}
    
	// legs
	float s = sign(q.x);
	for( int j=0; j<3; j++ )	{
        int i = (q.x>0.0)?j:j+3;
		float h = float(j)/3.0;
		
		vec3 bas = monster.center + muu*s*0.5 + monster.mww*1.0*(h-0.33) ;

		vec3 n1 = monster.ne[i];

        {
        float  le = 1.6;//length(n1-bas);
        mat3x3 tx = rotationAlign( (n1-bas)/le );
        vec3   w = tx*(p-bas);
        vec2   hh = sdSegmentH( le, w.zyx );
        float  dd = hh.x-mix(0.15,0.05,hh.y) + 0.05*sin(6.2831*hh.y);
        dd += 0.005*(sin(60.0*w.x+w.z*2.0)*sin(60.0*w.y+w.z*3.0));
        bas -= monster.center;
	    bas = vec3( bas.x, dot(mvv,bas), dot(monster.mww,bas) );
        float h = clamp( 0.5 + 0.5*(d1-dd)/0.2, 0.0, 1.0 );
        ref = mix(ref,bas+w.zyx,h);
		d1 = smin( d1, dd, 0.2 );
        b = mix(b,0.0,h);
        }

        {
        float  le = 1.2;//length(n1-bas);
        mat3x3 tx = rotationAlign( (monster.f0b[i]-n1)/le );
        vec3   w = tx*(p-n1);
        vec2   hh = sdSegmentH( le, w.zyx );
        float  dd = hh.x-mix(0.06,0.02,hh.y) + 0.01*cos(2.0*6.2831*hh.y);
        float h = clamp( 0.5 + 0.5*(d1-dd)/0.1, 0.0, 1.0 );
        ref = mix(ref,bas+vec3(1.6,0.0,0.0)+w.zyx,h);
		d1 = smin( d1, dd, 0.1 );
        }
	}
	
    // bump!
    //if( doBump )  // set to true for true displacement
    d1 -= (1.0+b)*0.02*(textureLod(iChannel2,1.5*ref.xz,0.0).x-0.15);
    
	vec2 res = vec2( 0.5*d1, 1.0 );

	// eyes
	if( eye<res.x ) res = vec2( eye, 0.0 );

	return res;
}

vec3 sdMonsterC( in vec3 p )
{
	vec3 q = p - monster.center;
	
	vec3 muu = vec3(1.0,0.0,0.0);
	vec3 mvv = normalize( cross(monster.mww,muu) );
	q = vec3( q.x, dot(mvv,q), dot(monster.mww,q) );
	vec3 res = q;

    // body
	float f = 0.5 - 0.5*q.z;
    float g = smoothstep(-0.2,0.2,q.y);
	float ab = (0.5 + g*0.5*cos( 1.0 + 40.0*pow(0.5-0.5*q.z,2.0) ))*(1.0-f);
	float d1 = sdEllipsoid( q, vec3(0.65,0.45,1.0)*(1.0+0.3*ab) );
	float ho = 1.0-clamp( 3.0*abs(q.x), 0.0, 1.0 );
	d1 += 0.1*(1.0-sqrt(1.0-ho*ho))*smoothstep( 0.0,0.1,-q.z );

	// legs
    float s = sign(q.x);
    for( int j=ZERO; j<3; j++ )
	{
        int i = (q.x>0.0)?j:j+3;
		float h = float(j)/3.0;
		
		vec3 bas = monster.center + muu*s*0.5 + monster.mww*1.0*(h-0.33) ;

		vec3 n1 = monster.ne[i];

        {
        float  le = 1.6;//length(n1-bas);
        mat3x3 tx = rotationAlign( (n1-bas)/le );
        vec3   w = tx*(p-bas);
        vec2   hh = sdSegmentH( le, w.zyx );
        float  dd = hh.x-mix(0.15,0.05,hh.y) + 0.05*sin(6.2831*hh.y);
        bas -= monster.center;
	    bas = vec3( bas.x, dot(mvv,bas), dot(monster.mww,bas) );
        float h = clamp( 0.5 + 0.5*(d1-dd)/0.2, 0.0, 1.0 );
        res = mix(res,bas+w.zyx,h);
        d1 = smin(d1,dd, 0.2);
        }
        
        {
        float  le = 1.2;//length(n1-bas);
        mat3x3 tx = rotationAlign( (monster.f0b[i]-n1)/le );
        vec3   w = tx*(p-n1);
        vec2   hh = sdSegmentH( le, w.zyx );
        float dd = hh.x-mix(0.06,0.02,hh.y) + 0.01*cos(2.0*6.2831*hh.y);
        float h = clamp( 0.5 + 0.5*(d1-dd)/0.1, 0.0, 1.0 );
        res = mix(res,bas+vec3(1.6,0.0,0.0)+w.zyx,h);
		d1 = smin( d1, dd, 0.1 );
        
        }
	}
		
	return res;
}

vec2 map( in vec3 p )
{
    vec2 res = sdMonster( p);

	float d2 = 0.5*(p.y - terrain(p.xz));
	if( d2<res.x ) res = vec2(d2,2.0);
	
	return res;
}

vec2 mapD( in vec3 p )
{
    vec2 res = sdMonster( p);

	float d2 = 0.5*(p.y - terrainD(p.xz));
	if( d2<res.x ) res = vec2(d2,2.0);
	
	return res;
}

vec3 raycast( in vec3 ro, in vec3 rd )
{
	float mind = 0.1;
	float maxd = 70.0;

    float tp = (15.0-ro.y)/rd.y;
    if( tp>0.0 )
    {
    if( ro.y<15.0 ) maxd=min(maxd,tp);
    else            mind=max(mind,tp);
    }

    float t = mind;
	float d = 0.0;
    float m = 1.0;
    for( int i=0; i<256; i++ )
    {
	    vec2 res = map( ro+rd*t );
        float h = res.x;
		d = res.y;
		m = res.y;
        if( abs(h)<(0.0005*t)||t>maxd ) break;
        t += h;
    }

    if( t>maxd ) m=-1.0;
    return vec3( t, d, m );
}


// https://iquilezles.org/articles/normalsSDF/
vec3 calcNormal( in vec3 pos )
{
    // inspired by tdhooper and klems - a way to prevent the compiler from inlining map() 4 times
    vec3 n = vec3(0.0);
    for( int i=ZERO; i<4; i++ )
    {
        vec3 e = 0.5773*(2.0*vec3((((i+3)>>1)&1),((i>>1)&1),(i&1))-1.0);
        n += e*mapD(pos+e*0.002).x;
    }
    return normalize(n);
}

// https://iquilezles.org/articles/rmshadows/
float softshadow( in vec3 ro, in vec3 rd, float mint, float k )
{
    float maxd = 70.0;
    
    if( ro.y<15.0 )
    {
    float tp = (15.0-ro.y)/rd.y;
    if( tp>0.0 ) maxd=min(maxd,tp);
    }
    
    float res = 1.0;
    float t = mint;
	float h = 1.0;
    for( int i=0; i<48; i++ )
    {
        h = map(ro + rd*t).x;
        res = min( res, smoothstep(0.0,1.0,k*h/t) );
		t += clamp( h, 0.025, 1.0 );
		if( h<0.001 || t>maxd) break;
    }
    return clamp(res,0.0,1.0);
}

vec3 path( float t )
{
    vec3 pos = vec3( 0.0 );
    pos.z += t*0.4;
	pos.y = 1.0 + terrainBase( pos.xz );
	return pos;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 p = (2.0*fragCoord-iResolution.xy)/iResolution.y;
    vec2 m = vec2(0.5);
	if( iMouse.z>0.0 ) m = iMouse.xy/iResolution.xy;

    //-----------------------------------------------------
    // animate
    //-----------------------------------------------------
	
	float ctime = 15.0 + iTime;

	// mobe body
	float atime = 2.0*ctime;
	float ac = noise( 0.5*ctime );
	atime += 4.0*ac;
    monster.center = path( atime );
	vec3 centerN = path( atime+2.0 );
	monster.mww = normalize( centerN - monster.center );
    monster.center.y -= 0.25;
	
	// move legs
	for( int i=0; i<6; i++ )
	{
		float s = -sign( float(i)-2.5 );
		float h = mod( float(i), 3.0 )/3.0;

		float z = 0.5*atime + 1.0*h + 0.25*s;
		float iz = floor(z);
		float fz = fract(z);
        float az = smoothstep(0.66,1.0,fz);
		
		vec3 fo = vec3(s*1.5, 0.7*az*(1.0-az), (iz + az + (h-0.3)*4.0)*0.4*2.0 );
		fo.y += terrain( fo.xz );
        monster.f0b[i] = fo;
		
		vec3 ba = monster.center + vec3(1.0,0.0,0.0)*s*0.5 + monster.mww*1.0*(h-0.33) ;

		monster.ne[i] = solve( ba, fo, 1.6, 1.2, s*vec3(0.0,0.0,-1.0) );
	}
	
    //-----------------------------------------------------
    // camera
    //-----------------------------------------------------
	
    // follow the monster
	float an = 0.0 + 0.1*ctime - 6.28*m.x;
	float cr = 0.3*cos(0.2*ctime);
    vec3 ro = monster.center + vec3(4.0*sin(an),0.2,4.0*cos(an));
    vec3 ta = monster.center;
	ro.y = 0.5 + terrainBase( ro.xz );
	
    // shake
	ro += 0.04*sin(4.0*ctime*vec3(1.1,1.2,1.3)+vec3(3.0,0.0,1.0) );
	ta += 0.04*sin(4.0*ctime*vec3(1.7,1.5,1.6)+vec3(1.0,2.0,1.0) );
	
    // camera matrix
    vec3 ww = normalize( ta - ro );
    vec3 uu = normalize( cross(ww,vec3(sin(cr),cos(cr),0.0) ) );
    vec3 vv = normalize( cross(uu,ww));
	
    // barrel distortion	
    float r2 = p.x*p.x*0.32 + p.y*p.y;
    p *= (7.0-sqrt(37.5-11.5*r2))/(r2+1.0);
	
	// create view ray
	vec3 rd = normalize( p.x*uu + p.y*vv + 3.0*ww );
    
    // ray differentials
    vec2 px = (-iResolution.xy+2.0*(fragCoord.xy+vec2(1.0,0.0)))/iResolution.y;
    r2 = px.x*px.x*0.32 + px.y*px.y;
    px *= (7.0-sqrt(37.5-11.5*r2))/(r2+1.0);
    vec2 py = (-iResolution.xy+2.0*(fragCoord.xy+vec2(0.0,1.0)))/iResolution.y;
    r2 = py.x*py.x*0.32 + py.y*py.y;
    py *= (7.0-sqrt(37.5-11.5*r2))/(r2+1.0);
    vec3 rdx = normalize( px.x*uu + px.y*vv + 3.0*ww );
    vec3 rdy = normalize( py.x*uu + py.y*vv + 3.0*ww );
    
    //-----------------------------------------------------
	// render
    //-----------------------------------------------------
    const vec3 lig = normalize(vec3(-1.0,0.4,0.2));
	float nds = clamp(dot(rd,lig),0.0,1.0);
	vec3 bgc = vec3(0.9+0.1*nds,0.95+0.05*nds,0.9)*(0.7 + 0.3*rd.y)*0.98;
    vec3 col = bgc;

	// raymarch
    vec3 tmat = raycast(ro,rd);
    if( tmat.z>-0.5 )
    {
        float t = tmat.x;
        
        // geometry
        vec3 pos = ro + t*rd;
        vec3 nor = calcNormal(pos);
		vec3 ref = reflect( rd, nor );

        // derivatives        
        vec3 dpdx, dpdy;
        calcDpDxy( ro, rd, rdx, rdy, t, nor, dpdx, dpdy );
    
        // materials
        float mocc = 1.0;
		vec4 mate = vec4(0.0);
		float ks = 1.0;
        
		// eyes
		if( tmat.z<0.5 )
		{
            mate = vec4(0.01,0.01,0.01,30.0);
            ks *= 0.07;
            mate.xyz *= mix(vec3(1.0,0.3,0.0),vec3(0.5,0.8,1.0),0.5+0.5*nor.y);
			mate.w *= 0.8 + 0.2*sin(20.0*ref.x)*sin(20.0*ref.y)*sin(20.0*ref.z);
			mate.xyz += 0.001*sin(5.0*ref);
			mate.xyz *= 0.5;
		}
		// body
		else if( tmat.z<1.5 )
		{
            // do shading in mosnter space			
			vec3 q = pos - monster.center;
			vec3 muu = vec3(1.0,0.0,0.0);
			vec3 mvv = normalize( cross(monster.mww,muu) );
			q = vec3( q.x, dot(mvv,q), dot(monster.mww,q) );
			vec3 n = vec3( nor.x, dot(mvv,nor), dot(monster.mww,nor) );

            // texture coords
            vec3 w = sdMonsterC(pos);

            // base color			
            mate.xyz = 0.15*vec3(1.0,0.7,0.4);			
            // bumps
            float te = textureLod(iChannel2,1.5*w.xz,0.0).x;
            mate.xyz = mix(mate.xyz,vec3(0.4,0.3,0.04),smoothstep(0.2,0.8,te));

            // texture
            mate.xyz += 0.08*smoothstep(vec3(0.4,0.3,0.2),vec3(0.7,0.6,0.8),vec3(fbmcheap(w*0.5)));

			// color adjustment
			mate.w = 1.0;
            mate.xyz *= 0.25+1.0*mate.xzy*vec3(0.98,1.6,1.4);
			
            // occlusion			
			float ho = 1.0-clamp( 5.0*abs(q.x), 0.0, 1.0 );
            mocc *= 1.0-(1.0-sqrt(1.0-ho*ho))*smoothstep( 0.0,0.1,-q.z );
            float eye = length( vec3(abs(q.x),q.yz) - vec3(0.3,0.05,0.9) ) - 0.3; 
            mocc *= clamp(1.0-2.0/(1.0+100.0*eye),0.0,1.0);

		}
        // terrain		
		else if( tmat.z<2.5 )
		{
			mate = vec4(1.0, 0.9, 0.5, 0.0);
            float nn =  noise( 2.0*pos.xz );

            mate.xyz = mix( 0.7*mate.xyz, mate.xyz*0.65*vec3(0.8,0.9,1.0), 1.0-smoothstep( 0.4, 0.9, nn ) );
			mate.xyz *= 0.45;

			vec3 ff  = 0.05+0.95*textureGrad( iChannel0, 0.08*pos.xz, 0.08*dpdx.xz, 0.08*dpdy.xz ).xyz;
			     ff *= 0.05+0.95*textureGrad( iChannel0, 0.52*pos.xz, 0.52*dpdx.xz, 0.52*dpdy.xz ).xyz;
			     ff *= 0.05+0.95*textureGrad( iChannel0, 4.03*pos.xz, 4.03*dpdx.xz, 4.03*dpdy.xz ).xyz;
			
			float aa = mix( 1.0, 0.3, smoothstep( 0.65, 0.8, nn ) );
            mate.xyz *= (1.0-aa) + aa*sqrt(ff)*3.0;
			
            float d = smoothstep( 0.0, 0.5, abs(nn-0.75) );
            mate.xyz *= 0.6+0.4*d;
            d = smoothstep( 0.0, 0.2, abs(nn-0.75) );
            mocc *= 0.7+0.3*d;
			mocc *= pow( clamp( 0.5*length( pos.xz - monster.center.xz ), 0.0, 1.0 ), 2.0 );
		}

		// lighting
		float occ = (0.5 + 0.5*nor.y)*mocc;
        float dif = max(dot(nor,lig),0.0);
        float bac = max(dot(nor,normalize(vec3(-lig.x,-lig.y*0.5,-lig.z))),0.0);
		float sha = 0.0; if( dif>0.01 ) sha=softshadow( pos, lig, 0.05, 32.0 );
        vec3  hal = normalize(lig-rd);
        float fre = pow( clamp( 1.0 + dot(nor,rd), 0.0, 1.0 ), 2.0 );
        float spe = pow( clamp( dot(hal,nor), 0.0, 1.0), 24.0 );
		spe *= 0.04+0.96*pow(clamp(1.0-dot(hal,lig),0.0,1.0),5.0);
		
		// lights
		vec3 lin = vec3(0.0);
        lin += 3.0*dif*vec3(1.50,1.00,0.65)*pow(vec3(sha),vec3(1.0,1.2,1.5));
        lin += 1.0*mix(vec3(0.10,0.05,0.0),vec3(0.2,0.3,0.35)*2.0*mocc, 0.5+0.5*nor.y );
		lin += 3.0*bac*vec3(0.30,0.20,0.15)*occ;
        lin += 1.0*fre*vec3(0.50,0.50,0.50)*occ*15.0*mate.w*(0.05+0.95*dif*sha);
		lin += 1.0*spe*vec3(1.0)*6.0*occ*mate.w*dif*sha;
		col = mate.xyz * lin;
		col += 1.0*spe*vec3(1.0)*10.0*occ*mate.w*dif*sha*ks;

		// fog		
		col = mix( col, 0.8*bgc, clamp(1.0-1.2*exp(-0.03*tmat.x ),0.0,1.0) );
    }
	else
	{
        // sun		
	    vec3 sun = vec3(1.0,0.8,0.5)*pow( nds, 24.0 );
	    col += sun;
	}
    // sun scatter
	col += 0.4*vec3(0.2,0.14,0.1)*pow( nds, 16.0 );

    // color
    col *= 4.0/(3.0+col);
    col = pow( col, vec3(0.45,0.5,0.55) );
    col.z += 0.1;
    
	// vigneting
	vec2 q = fragCoord/iResolution.xy;
    col *= 0.2 + 0.8*pow( 16.0*q.x*q.y*(1.0-q.x)*(1.0-q.y), 0.1 );

    fragColor = vec4( col, 1.0 );
}
