package com.picknic.backend.util;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.nimbusds.jose.jwk.JWK;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.net.URL;
import java.security.interfaces.RSAPublicKey;

@Component
public class CognitoTokenValidator {

    @Value("${aws.cognito.region}")
    private String region;

    @Value("${aws.cognito.user-pool-id}")
    private String userPoolId;

    private JWKSet jwkSet;
    private String issuer;

    @PostConstruct
    public void init() {
        // Cognito JWKS URL: https://cognito-idp.{region}.amazonaws.com/{userPoolId}/.well-known/jwks.json
        String jwksUrl = String.format(
            "https://cognito-idp.%s.amazonaws.com/%s/.well-known/jwks.json",
            region, userPoolId
        );

        try {
            URL url = new URL(jwksUrl);
            jwkSet = JWKSet.load(url);
            issuer = String.format("https://cognito-idp.%s.amazonaws.com/%s", region, userPoolId);
        } catch (Exception e) {
            throw new RuntimeException("Failed to load JWKS from Cognito", e);
        }
    }

    public DecodedJWT validateAndDecode(String idToken) throws JWTVerificationException {
        try {
            // 1. JWT 파싱 (검증 없이)
            DecodedJWT jwt = JWT.decode(idToken);

            // 2. kid(key ID)로 공개키 찾기
            String kid = jwt.getKeyId();
            JWK jwk = jwkSet.getKeyByKeyId(kid);
            if (jwk == null) {
                throw new JWTVerificationException("No matching key found");
            }

            // 3. RS256 검증기 생성
            RSAPublicKey publicKey = ((RSAKey) jwk).toRSAPublicKey();
            Algorithm algorithm = Algorithm.RSA256(publicKey, null);

            // 4. JWT 검증 (서명, issuer, 만료시간)
            JWTVerifier verifier = JWT.require(algorithm)
                .withIssuer(issuer)
                .withClaim("token_use", "id") // ID 토큰만 허용
                .build();

            return verifier.verify(idToken);

        } catch (Exception e) {
            throw new JWTVerificationException("Invalid Cognito ID token", e);
        }
    }

    public String getEmailFromToken(DecodedJWT token) {
        return token.getClaim("email").asString();
    }

    public String getCognitoSubFromToken(DecodedJWT token) {
        return token.getSubject();
    }
}
